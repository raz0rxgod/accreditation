import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsInboxController } from './notifications-inbox.controller';
import { NotificationsInboxService } from './notifications-inbox.service';
import { NotificationsInboxGateway } from './notifications-inbox.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [NotificationsInboxController],
  providers: [NotificationsInboxService, NotificationsInboxGateway],
  exports: [NotificationsInboxService],
})
export class NotificationsInboxModule {}
