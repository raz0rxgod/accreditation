import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtEitherAuthGuard } from '../../common/guards/jwt-either-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtEitherAuthGuard)
@Controller('applications/:applicationId/chat')
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Get()
  getMessages(@Param('applicationId') applicationId: string, @CurrentUser() who: any) {
    return this.service.getMessages(applicationId, this.toSender(who));
  }

  @Post()
  sendMessage(
    @Param('applicationId') applicationId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() who: any,
  ) {
    return this.service.sendMessage(applicationId, this.toSender(who), dto.message);
  }

  // req.user приходит либо из стратегии заявителя ({userId, ...}), либо сотрудника ({staffId, role, ...})
  private toSender(who: any) {
    return who.staffId
      ? ({ type: 'staff', id: who.staffId } as const)
      : ({ type: 'user', id: who.userId } as const);
  }
}
