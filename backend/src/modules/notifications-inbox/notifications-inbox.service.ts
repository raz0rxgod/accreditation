import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsInboxGateway, NotificationRecipient } from './notifications-inbox.gateway';

interface CreateNotificationInput {
  type: 'chat_message' | 'status_changed';
  title: string;
  body: string;
  link?: string;
}

@Injectable()
export class NotificationsInboxService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsInboxGateway,
  ) {}

  /** Уведомить одного заявителя (например: изменился статус его анкеты, ответили в чате). */
  async notifyUser(userId: string, input: CreateNotificationInput) {
    const notification = await this.prisma.inboxNotification.create({
      data: { ...input, recipientUserId: userId },
    });
    this.pushWithUnreadCount({ type: 'user', id: userId }, notification);
    return notification;
  }

  /** Уведомить конкретного сотрудника. */
  async notifyStaff(staffId: string, input: CreateNotificationInput) {
    const notification = await this.prisma.inboxNotification.create({
      data: { ...input, recipientStaffId: staffId },
    });
    this.pushWithUnreadCount({ type: 'staff', id: staffId }, notification);
    return notification;
  }

  /**
   * Уведомить всех активных сотрудников с одной из ролей — используется для
   * событий, не привязанных к конкретному ответственному (заявку в системе
   * не закрепляют за сотрудником, её видят и ведут все с нужной ролью).
   */
  async notifyStaffRoles(roles: string[], input: CreateNotificationInput) {
    const staff = await this.prisma.staffUser.findMany({
      where: { active: true, role: { in: roles as any } },
      select: { id: true },
    });

    await Promise.all(
      staff.map(async (s) => {
        const notification = await this.prisma.inboxNotification.create({
          data: { ...input, recipientStaffId: s.id },
        });
        this.pushWithUnreadCount({ type: 'staff', id: s.id }, notification);
      }),
    );
  }

  async listForRecipient(recipient: NotificationRecipient, limit = 30) {
    const where =
      recipient.type === 'user' ? { recipientUserId: recipient.id } : { recipientStaffId: recipient.id };

    const [items, unreadCount] = await Promise.all([
      this.prisma.inboxNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.inboxNotification.count({ where: { ...where, read: false } }),
    ]);

    return { items, unreadCount };
  }

  async markRead(id: string, recipient: NotificationRecipient) {
    const where =
      recipient.type === 'user'
        ? { id, recipientUserId: recipient.id }
        : { id, recipientStaffId: recipient.id };

    // updateMany вместо update: если уведомление не найдено или принадлежит
    // не этому получателю — просто ничего не делаем (0 записей), без 404 —
    // это не ошибка с точки зрения UI, повторный клик на уже прочитанное.
    await this.prisma.inboxNotification.updateMany({ where, data: { read: true } });
  }

  async markAllRead(recipient: NotificationRecipient) {
    const where =
      recipient.type === 'user'
        ? { recipientUserId: recipient.id, read: false }
        : { recipientStaffId: recipient.id, read: false };

    await this.prisma.inboxNotification.updateMany({ where, data: { read: true } });
  }

  private async pushWithUnreadCount(recipient: NotificationRecipient, notification: unknown) {
    const where =
      recipient.type === 'user'
        ? { recipientUserId: recipient.id, read: false }
        : { recipientStaffId: recipient.id, read: false };
    const unreadCount = await this.prisma.inboxNotification.count({ where });
    this.gateway.emit(recipient, { notification, unreadCount });
  }
}
