import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrintPackService } from './print-pack.service';
import { JwtStaffAuthGuard } from '../../common/guards/jwt-staff-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('print-pack')
@ApiBearerAuth()
@UseGuards(JwtStaffAuthGuard, RolesGuard)
@Controller('applications')
export class PrintPackController {
  constructor(private readonly service: PrintPackService) {}

  /** «Отправить всё на печать» (ТЗ, II.2) — один PDF со всеми документами всех участников заявки. */
  @Roles('mfa_officer', 'admin')
  @Post(':id/print-pack')
  generate(@Param('id') applicationId: string) {
    return this.service.generate(applicationId);
  }
}
