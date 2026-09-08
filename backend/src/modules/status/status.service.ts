import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsInboxService } from '../notifications-inbox/notifications-inbox.service';
import { CardsService } from '../cards/cards.service';
import { ChangeStatusDto } from './dto/change-status.dto';

const STATUS_LABELS_RU: Record<string, string> = {
  new: 'Новая',
  in_review: 'На рассмотрении',
  approved: 'Одобрено',
  rejected: 'Отказано',
};

@Injectable()
export class StatusService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private inbox: NotificationsInboxService,
    private cards: CardsService,
  ) {}

  async changeApplicantStatus(applicantId: string, staffId: string, dto: ChangeStatusDto) {
    const applicant = await this.prisma.applicant.findUnique({
      where: { id: applicantId },
      include: { application: { include: { user: true } }, media: true },
    });
    if (!applicant) throw new NotFoundException('Анкета не найдена');

    const oldStatus = applicant.status;

    // Транзакция: меняем статус анкеты, пишем историю и пересчитываем статус
    // заявки атомарно — чтобы не оказаться в промежуточном рассинхронизированном состоянии.
    await this.prisma.$transaction([
      this.prisma.applicant.update({
        where: { id: applicantId },
        data: { status: dto.newStatus },
      }),
      this.prisma.statusHistory.create({
        data: {
          applicantId,
          staffId,
          oldStatus,
          newStatus: dto.newStatus,
          internalComment: dto.internalComment,
        },
      }),
    ]);

    const newApplicationStatus = await this.recomputeApplicationStatus(applicant.applicationId);

    if (dto.newStatus === 'approved') {
      // Генерируем карту сразу при одобрении, чтобы заявитель мог сразу её увидеть в ЛК.
      // Ошибку генерации не даём сломать основной ответ — карту всегда можно перегенерировать вручную.
      try {
        await this.cards.generateForApplicant(applicantId);
      } catch (err) {
        console.error(`Не удалось сгенерировать карту для анкеты ${applicantId}:`, err);
      }
    }

    // Как и с генерацией карты выше: уведомления — не часть основной операции.
    // Статус уже сменён и записан в историю, письмо/колокольчик не должны
    // откатывать или блокировать сам факт смены статуса.
    try {
      const isRejection = dto.newStatus === 'rejected';

      await this.notifications.send({
        recipientEmail: applicant.application.user.email,
        type: isRejection ? 'applicant_rejected' : 'applicant_status_changed',
        subject: isRejection
          ? `Решение по заявке № ${applicant.application.applicationNumber} на аккредитацию`
          : `Статус аккредитации изменён — заявка ${applicant.application.applicationNumber}`,
        body: isRejection
          ? this.buildRejectionLetter(applicant)
          : this.buildNotificationBody(applicant, dto.newStatus, newApplicationStatus),
      });

      await this.inbox.notifyUser(applicant.application.userId, {
        type: 'status_changed',
        title: `Статус заявки № ${applicant.application.applicationNumber} изменён`,
        body: `${applicant.lastName} ${applicant.firstName}: ${STATUS_LABELS_RU[dto.newStatus] ?? dto.newStatus}`,
        link: `/dashboard/${applicant.applicationId}`,
      });
    } catch (err) {
      console.error(`Не удалось отправить уведомление об изменении статуса анкеты ${applicantId}:`, err);
    }

    return this.prisma.applicant.findUnique({
      where: { id: applicantId },
      include: { statusHistory: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async getHistory(applicantId: string) {
    const applicant = await this.prisma.applicant.findUnique({ where: { id: applicantId } });
    if (!applicant) throw new NotFoundException('Анкета не найдена');

    return this.prisma.statusHistory.findMany({
      where: { applicantId },
      include: { staff: { select: { fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Карточка истории заявителя (ТЗ, II.3): при повторной подаче администрация видит все прошлые
   * обращения того же человека (распознанного по Person — ФИО+паспорт/email) и может
   * мгновенно прочитать сохранённый внутренний комментарий к прошлому отказу.
   * Возвращает [] если анкета ещё не привязана к Person (первое обращение) — не ошибка.
   */
  async getPersonHistory(applicantId: string) {
    const applicant = await this.prisma.applicant.findUnique({
      where: { id: applicantId },
      select: { personId: true },
    });
    if (!applicant) throw new NotFoundException('Анкета не найдена');
    if (!applicant.personId) return [];

    const others = await this.prisma.applicant.findMany({
      where: { personId: applicant.personId, id: { not: applicantId } },
      include: {
        application: { select: { applicationNumber: true, submittedAt: true, createdAt: true } },
        media: { select: { name: true } },
        // Только последний отказ по анкете — этого достаточно, чтобы сотрудник сразу
        // понял причину без перехода в саму старую заявку.
        statusHistory: {
          where: { newStatus: 'rejected' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { internalComment: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return others.map((a) => ({
      applicantId: a.id,
      applicationNumber: a.application.applicationNumber,
      submittedAt: a.application.submittedAt ?? a.application.createdAt,
      status: a.status,
      media: a.media?.name ?? null,
      lastRejectionComment: a.statusHistory[0]?.internalComment ?? null,
    }));
  }

  /**
   * Статус заявки — производная от статусов всех анкет внутри неё, а не
   * независимое поле: пока хоть одна анкета не решена — заявка "in_review",
   * когда все решены — "approved", если решены все и хотя бы одна одобрена,
   * иначе (все отклонены) — "rejected".
   */
  private async recomputeApplicationStatus(applicationId: string) {
    const applicants = await this.prisma.applicant.findMany({
      where: { applicationId },
      select: { status: true },
    });

    const allDecided = applicants.every((a) => a.status === 'approved' || a.status === 'rejected');
    const anyApproved = applicants.some((a) => a.status === 'approved');

    let newStatus: 'in_review' | 'approved' | 'rejected' = 'in_review';
    if (allDecided) {
      newStatus = anyApproved ? 'approved' : 'rejected';
    }

    await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: newStatus },
    });

    return newStatus;
  }

  /**
   * Официальное письмо об отказе — фиксированный текст, без
   * упоминания причины (internalComment туда намеренно не попадает — эта причина
   * видна только сотрудникам, см. ChangeStatusDto/RejectModal).
   */
  private buildRejectionLetter(applicant: {
    firstName: string;
    middleName?: string | null;
    media?: { name: string } | null;
    application: { applicationNumber: string; submittedAt: Date | null; createdAt: Date };
  }): string {
    const nameAndPatronymic = [applicant.firstName, applicant.middleName].filter(Boolean).join(' ');
    const submittedDate = (applicant.application.submittedAt ?? applicant.application.createdAt).toLocaleDateString(
      'ru-RU',
    );
    const mediaName = applicant.media?.name ?? '—';

    return (
      `Уважаемый(ая) ${nameAndPatronymic},\n\n` +
      `Администрация портала информирует вас о том, что ваша заявка № ${applicant.application.applicationNumber} от ${submittedDate} на получение временной аккредитации для представления интересов ${mediaName} была рассмотрена.\n\n` +
      `Настоящим сообщаем, что в выдаче аккредитации отказано. В соответствии с действующим регламентом администрация оставляет за собой право не комментировать основания для принятия данного решения.\n\n` +
      `Обращаем ваше внимание, что в отсутствие действующей аккредитации осуществление профессиональной деятельности (включая проведение съёмок, запись интервью с официальными лицами и сбор информации в качестве представителя организации) не допускается. Ввоз профессионально-технического оборудования без специального разрешения также ограничен действующим регламентом.\n\n` +
      `С уважением,\nСлужба по работе с заявителями`
    );
  }

  private buildNotificationBody(
    applicant: { lastName: string; firstName: string },
    newApplicantStatus: string,
    newApplicationStatus: string,
  ): string {
    const fullName = `${applicant.lastName} ${applicant.firstName}`;
    return (
      `По участнику "${fullName}" изменён статус аккредитации: ${STATUS_LABELS_RU[newApplicantStatus]}. ` +
      `Общий статус заявки: ${STATUS_LABELS_RU[newApplicationStatus]}. ` +
      `Подробности и переписку по заявке смотрите в личном кабинете на портале аккредитации.`
    );
  }
}
