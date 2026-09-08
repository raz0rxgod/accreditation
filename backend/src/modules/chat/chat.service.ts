import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsInboxService } from '../notifications-inbox/notifications-inbox.service';

export type ChatSender = { type: 'user'; id: string } | { type: 'staff'; id: string };

@Injectable()
export class ChatService {
  private logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private inbox: NotificationsInboxService,
  ) {}

  async sendMessage(applicationId: string, sender: ChatSender, message: string) {
    const application = await this.assertAccess(applicationId, sender);

    const saved = await this.prisma.chatMessage.create({
      data: {
        applicationId,
        message,
        senderUserId: sender.type === 'user' ? sender.id : undefined,
        senderStaffId: sender.type === 'staff' ? sender.id : undefined,
      },
      include: {
        senderUser: { select: { fullName: true } },
        senderStaff: { select: { fullName: true, role: true } },
      },
    });

    // Уведомления (email + колокольчик) — побочный эффект, а не часть основной
    // транзакции отправки сообщения. Если тут что-то упадёт (SMTP недоступен,
    // не накатилась миграция и т.п.), сообщение всё равно должно уйти в чат —
    // поэтому не даём исключению всплыть выше этой точки.
    try {
      // Заявителя уведомляем письмом только на сообщения от сотрудника администрации — свои же
      // сообщения он и так видит в чате, письмо о них было бы шумом.
      if (sender.type === 'staff') {
        const user = await this.prisma.user.findUnique({ where: { id: application.userId } });
        if (user) {
          await this.notifications.send({
            recipientEmail: user.email,
            type: 'chat_message',
            subject: `Новое сообщение по заявке ${application.applicationNumber}`,
            body: `${saved.senderStaff?.fullName ?? 'Сотрудник администрации'} написал(а) вам в чате заявки № ${application.applicationNumber}:\n\n«${message}»\n\nОтветить можно в личном кабинете, в разделе заявки.`,
          });
        }

        await this.inbox.notifyUser(application.userId, {
          type: 'chat_message',
          title: `Новое сообщение по заявке № ${application.applicationNumber}`,
          body: message,
          link: `/dashboard/${application.id}`,
        });
      } else {
        // Заявка ни за кем не закреплена — чат в системе видят и ведут все
        // сотрудники с соответствующей ролью, поэтому уведомляем всех разом.
        await this.inbox.notifyStaffRoles(['mfa_officer', 'admin'], {
          type: 'chat_message',
          title: `Сообщение по заявке № ${application.applicationNumber}`,
          body: message,
          link: `/admin/applications/${application.id}`,
        });
      }
    } catch (err) {
      this.logger.error(`Не удалось отправить уведомление о сообщении в чате заявки ${applicationId}:`, err as Error);
    }

    return saved;
  }

  async getMessages(applicationId: string, sender: ChatSender) {
    await this.assertAccess(applicationId, sender);

    return this.prisma.chatMessage.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'asc' },
      include: {
        senderUser: { select: { fullName: true } },
        senderStaff: { select: { fullName: true, role: true } },
      },
    });
  }

  /**
   * Проверка доступа к чату заявки: заявитель — только к своей заявке,
   * сотрудник администрации — к любой (чат виден всем сотрудникам, ведущим рассмотрение).
   */
  async assertAccess(applicationId: string, sender: ChatSender) {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) throw new NotFoundException('Заявка не найдена');

    if (sender.type === 'user' && application.userId !== sender.id) {
      throw new ForbiddenException('Нет доступа к чату этой заявки');
    }
    return application;
  }
}
