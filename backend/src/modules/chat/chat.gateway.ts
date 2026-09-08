import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService, ChatSender } from './chat.service';

interface AuthedSocket extends Socket {
  data: { sender?: ChatSender };
}

@WebSocketGateway({
  namespace: 'chat',
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private jwt: JwtService,
  ) {}

  /**
   * Аутентификация при подключении: клиент передаёт JWT (заявителя или сотрудника)
   * в handshake.auth.token. Sockets не проходят через обычные Nest Guard'ы,
   * поэтому проверяем токен вручную здесь же.
   */
  handleConnection(client: AuthedSocket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload: any = this.jwt.verify(token);
      client.data.sender =
        payload.type === 'staff' ? { type: 'staff', id: payload.sub } : { type: 'user', id: payload.sub };
    } catch {
      this.logger.warn('Подключение с недействительным токеном отклонено');
      client.disconnect();
    }
  }

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { applicationId: string },
  ) {
    if (!client.data.sender) return;
    await this.chatService.assertAccess(data.applicationId, client.data.sender);
    client.join(this.roomName(data.applicationId));
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { applicationId: string; message: string },
  ) {
    if (!client.data.sender) return;

    const saved = await this.chatService.sendMessage(
      data.applicationId,
      client.data.sender,
      data.message,
    );

    this.server.to(this.roomName(data.applicationId)).emit('message', saved);
    return saved;
  }

  private roomName(applicationId: string): string {
    return `application:${applicationId}`;
  }
}
