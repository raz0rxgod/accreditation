import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';

interface SendEmailInput {
  recipientEmail: string;
  type: string;
  subject: string;
  body: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue('emails') private emailQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async send(input: SendEmailInput) {
    const notification = await this.prisma.notification.create({
      data: {
        recipientEmail: input.recipientEmail,
        type: input.type,
        subject: input.subject,
        body: input.body,
        status: 'queued',
      },
    });

    await this.emailQueue.add('send-email', { notificationId: notification.id });

    return notification;
  }
}
