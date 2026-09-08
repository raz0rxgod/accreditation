import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsInboxService } from './notifications-inbox.service';
import { JwtEitherAuthGuard } from '../../common/guards/jwt-either-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationRecipient } from './notifications-inbox.gateway';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtEitherAuthGuard)
@Controller('notifications')
export class NotificationsInboxController {
  constructor(private readonly service: NotificationsInboxService) {}

  @Get()
  list(@CurrentUser() who: any) {
    return this.service.listForRecipient(this.toRecipient(who));
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() who: any) {
    return this.service.markRead(id, this.toRecipient(who));
  }

  @Post('read-all')
  markAllRead(@CurrentUser() who: any) {
    return this.service.markAllRead(this.toRecipient(who));
  }

  private toRecipient(who: any): NotificationRecipient {
    return who.staffId ? { type: 'staff', id: who.staffId } : { type: 'user', id: who.userId };
  }
}
