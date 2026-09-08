import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import { AddEquipmentItemsDto } from './dto/add-equipment-items.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtEitherAuthGuard } from '../../common/guards/jwt-either-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('equipment')
@ApiBearerAuth()
@Controller('applications/:applicationId/equipment')
export class EquipmentController {
  constructor(private readonly service: EquipmentService) {}

  /** Добавить одну или несколько единиц техники в список заявки. */
  @UseGuards(JwtAuthGuard)
  @Post()
  addItems(
    @Param('applicationId') applicationId: string,
    @Body() dto: AddEquipmentItemsDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.addItems(applicationId, user.userId, dto.items);
  }

  /** Список техники заявки — доступно и заявителю, и сотруднику. */
  @UseGuards(JwtEitherAuthGuard)
  @Get()
  get(@Param('applicationId') applicationId: string, @CurrentUser() who: any) {
    const requester = who.staffId
      ? ({ type: 'staff' } as const)
      : ({ type: 'user', id: who.userId } as const);
    return this.service.getForApplication(applicationId, requester);
  }

  /** Сгенерировать/перегенерировать групповой QR на технику. */
  @UseGuards(JwtAuthGuard)
  @Post('qr')
  generateQr(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.generateQr(applicationId, user.userId);
  }
}

@ApiTags('equipment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('equipment-items')
export class EquipmentItemsController {
  constructor(private readonly service: EquipmentService) {}

  /** Удалить позицию техники (пока заявка не отправлена). */
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.service.removeItem(id, user.userId);
  }
}
