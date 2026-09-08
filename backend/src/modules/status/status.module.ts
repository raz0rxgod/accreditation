import { Module } from '@nestjs/common';
import { StatusController } from './status.controller';
import { StatusService } from './status.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationsInboxModule } from '../notifications-inbox/notifications-inbox.module';
import { CardsModule } from '../cards/cards.module';

@Module({
  imports: [NotificationsModule, NotificationsInboxModule, CardsModule],
  controllers: [StatusController],
  providers: [StatusService],
  exports: [StatusService],
})
export class StatusModule {}
