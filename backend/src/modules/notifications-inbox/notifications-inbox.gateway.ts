import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

export type NotificationRecipient = { type: 'user'; id: string } | { type: 'staff'; id: string };

interface AuthedSocket extends Socket {
  data: { recipient?: NotificationRecipient };
}

/**
 * Отдельный namespace от чата: колокольчик должен жить на любой странице сайта,
 * а не только там, где открыт конкретный чат заявки. При подключении клиент
 * сразу попадает в свою персональную комнату (без явного 'join', в отличие от чата) —
 * ему больше некуда вступать, у него только одна лента уведомлений.
 */
@WebSocketGateway({
  namespace: 'notifications',
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
})
export class NotificationsInboxGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(NotificationsInboxGateway.name);

  constructor(private jwt: JwtService) {}

  handleConnection(client: AuthedSocket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload: any = this.jwt.verify(token);
      const recipient: NotificationRecipient =
        payload.type === 'staff' ? { type: 'staff', id: payload.sub } : { type: 'user', id: payload.sub };
      client.data.recipient = recipient;
      client.join(this.roomName(recipient));
    } catch {
      this.logger.warn('Подключение к ленте уведомлений с недействительным токеном отклонено');
      client.disconnect();
    }
  }

  emit(recipient: NotificationRecipient, payload: unknown) {
    this.server.to(this.roomName(recipient)).emit('notification', payload);
  }

  private roomName(recipient: NotificationRecipient): string {
    return `${recipient.type}:${recipient.id}`;
  }
}
