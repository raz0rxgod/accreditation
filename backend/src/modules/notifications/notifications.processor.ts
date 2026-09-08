import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('emails')
export class NotificationsProcessor {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    // Многие хостинговые SMTP требуют неявный TLS сразу на порту 465 (в отличие
    // от STARTTLS на 587) — nodemailer не выводит это из номера порта сам,
    // нужно явно указать secure:true. По умолчанию false (подходит для 587/25).
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  constructor(private prisma: PrismaService) {}

  @Process('send-email')
  async handleSendEmail(job: Job<{ notificationId: string }>) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: job.data.notificationId },
    });
    if (!notification) return;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: notification.recipientEmail,
        subject: notification.subject,
        text: notification.body,
      });

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'sent', sentAt: new Date() },
      });
    } catch (error) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'failed' },
      });
      throw error;
    }
  }
}
