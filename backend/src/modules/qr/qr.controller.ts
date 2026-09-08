import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QrService } from './qr.service';
import { ScanQrDto } from './dto/scan-qr.dto';
import { JwtStaffAuthGuard } from '../../common/guards/jwt-staff-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('qr')
@Controller('qr')
export class QrController {
  constructor(private readonly service: QrService) {}

  /**
   * Публичная проверка по ссылке из QR — без авторизации, для случаев, когда QR
   * сканируют обычным приложением-камерой телефона (не панелью сотрудника).
   * TODO: добавить rate-limiting (@nestjs/throttler), если понадобится защита от перебора —
   * сама подпись HMAC уже не даёт подделать токен, так что риск ограничен DoS-перебором.
   */
  @Get('verify')
  verify(@Query('token') token: string) {
    return this.service.scan({ token }, null);
  }

  /** Сканирование QR на КПП или таможне — возвращает valid/expired/not_approved. */
  @ApiBearerAuth()
  @UseGuards(JwtStaffAuthGuard, RolesGuard)
  @Roles('checkpoint', 'customs', 'admin')
  @Post('scan')
  scan(@Body() dto: ScanQrDto, @CurrentUser() staff: { staffId: string }) {
    return this.service.scan(dto, staff.staffId);
  }

  /** История сканирований (для отчётности). */
  @ApiBearerAuth()
  @UseGuards(JwtStaffAuthGuard, RolesGuard)
  @Roles('checkpoint', 'customs', 'admin', 'mfa_officer')
  @Get('history')
  getHistory(
    @Query('accreditationCardId') accreditationCardId?: string,
    @Query('equipmentListId') equipmentListId?: string,
  ) {
    return this.service.getHistory({ accreditationCardId, equipmentListId });
  }
}
