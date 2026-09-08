import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../../common/storage/storage.service';

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private storage: StorageService,
  ) {}

  /** Создаёт черновик групповой заявки для текущего пользователя. */
  async create(userId: string) {
    const applicationNumber = await this.generateApplicationNumber();

    return this.prisma.application.create({
      data: {
        applicationNumber,
        userId,
        status: 'draft',
      },
    });
  }

  /** Список заявок текущего пользователя (для личного кабинета). */
  async findAllForUser(userId: string) {
    return this.prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        applicants: {
          select: { id: true, lastName: true, firstName: true, status: true },
        },
      },
    });
  }

  /** Список всех заявок для сотрудников администрации, с фильтром по статусу. */
  async findAllForStaff(status?: string) {
    return this.prisma.application.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true } },
        applicants: {
          select: { id: true, lastName: true, firstName: true, status: true },
        },
      },
    });
  }

  async findOne(id: string, requester: { userId?: string; isStaff?: boolean }) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        applicants: {
          include: { documents: true, media: true, accreditationCard: true, citizenshipCountry: true },
        },
        equipmentList: { include: { items: true } },
        user: { select: { fullName: true, email: true } },
      },
    });

    if (!application) throw new NotFoundException('Заявка не найдена');

    if (!requester.isStaff && application.userId !== requester.userId) {
      throw new ForbiddenException('Нет доступа к этой заявке');
    }

    // Подписанная ссылка на фото — вычисляется на лету, как и downloadUrl документов,
    // фотография не имеет своего эндпоинта чтения, отдаётся вместе с анкетой.
    const applicantsWithPhoto = await Promise.all(
      application.applicants.map(async (applicant) => ({
        ...applicant,
        photoUrl: applicant.photoPath ? await this.storage.getSignedUrl(applicant.photoPath) : null,
      })),
    );

    return { ...application, applicants: applicantsWithPhoto };
  }

  /**
   * Отправка заявки на рассмотрение.
   * Проверяет, что в заявке есть хотя бы одна анкета и что все анкеты
   * прошли базовую валидацию (обязательные поля, сроки действия документов).
   */
  async submit(id: string, userId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { applicants: true },
    });

    if (!application) throw new NotFoundException('Заявка не найдена');
    if (application.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этой заявке');
    }
    if (application.status !== 'draft') {
      throw new BadRequestException('Заявка уже отправлена на рассмотрение');
    }
    if (application.applicants.length === 0) {
      throw new BadRequestException('Добавьте хотя бы одного участника перед отправкой');
    }

    const errors: string[] = [];
    for (const applicant of application.applicants) {
      errors.push(...this.validateApplicantForSubmission(applicant));
    }
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Заявка не может быть отправлена — исправьте ошибки в анкетах',
        errors,
      });
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
        applicants: {
          updateMany: { where: {}, data: { status: 'in_review' } },
        },
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.notifications.send({
        recipientEmail: user.email,
        type: 'application_submitted',
        subject: `Заявка ${application.applicationNumber} отправлена на рассмотрение`,
        body: `Ваша заявка на аккредитацию № ${application.applicationNumber} принята и передана на рассмотрение администрации портала. Мы уведомим вас о результатах по каждому участнику.`,
      });
    }

    return updated;
  }

  /** Правила валидации одной анкеты перед отправкой на рассмотрение. */
  private validateApplicantForSubmission(applicant: {
    lastName: string;
    firstName: string;
    passportNumber: string | null;
    passportExpiry: Date | null;
    visaFree: boolean;
    visaExpiry: Date | null;
    noPressCard: boolean;
    pressCardExpiry: Date | null;
    tripStart: Date | null;
    tripEnd: Date | null;
    mediaId: string | null;
  }): string[] {
    const errors: string[] = [];
    const name = `${applicant.lastName} ${applicant.firstName}`.trim() || 'Без имени';
    const today = new Date();

    if (!applicant.passportNumber) errors.push(`${name}: не указан номер паспорта`);
    if (!applicant.passportExpiry) {
      errors.push(`${name}: не указан срок действия паспорта`);
    } else if (applicant.passportExpiry < today) {
      errors.push(`${name}: срок действия паспорта истёк`);
    }

    if (!applicant.visaFree) {
      if (!applicant.visaExpiry) {
        errors.push(`${name}: не указан срок действия визы (или отметьте безвизовый режим)`);
      } else if (applicant.visaExpiry < today) {
        errors.push(`${name}: срок действия визы истёк`);
      }
    }

    if (!applicant.noPressCard) {
      if (!applicant.pressCardExpiry) {
        errors.push(`${name}: не указан срок действия пресс-карты (или отметьте её отсутствие)`);
      } else if (applicant.pressCardExpiry < today) {
        errors.push(`${name}: срок действия пресс-карты истёк`);
      }
    }

    if (!applicant.tripStart || !applicant.tripEnd) {
      errors.push(`${name}: не указан срок пребывания в Абхазии`);
    } else if (applicant.tripStart > applicant.tripEnd) {
      errors.push(`${name}: дата начала поездки позже даты окончания`);
    }

    if (!applicant.mediaId) errors.push(`${name}: не указана организация`);

    return errors;
  }

  private async generateApplicationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.application.count({
      where: { createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `MFA-${year}-${seq}`;
  }
}
