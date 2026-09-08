import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StatusService } from './status.service';
import { ChangeStatusDto } from './dto/change-status.dto';
import { JwtStaffAuthGuard } from '../../common/guards/jwt-staff-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('status')
@ApiBearerAuth()
@UseGuards(JwtStaffAuthGuard, RolesGuard)
@Controller()
export class StatusController {
  constructor(private readonly service: StatusService) {}

  /** Изменить статус анкеты (Принято на рассмотрение / Одобрено / Отказ). */
  @Roles('mfa_officer', 'admin')
  @Patch('applicants/:id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() staff: { staffId: string },
  ) {
    return this.service.changeApplicantStatus(id, staff.staffId, dto);
  }

  /** История изменений статуса анкеты (для сотрудников). */
  @Roles('mfa_officer', 'admin')
  @Get('applicants/:id/status-history')
  getHistory(@Param('id') id: string) {
    return this.service.getHistory(id);
  }

  /** Карточка истории журналиста — прошлые обращения того же человека (ТЗ, II.3). */
  @Roles('mfa_officer', 'admin')
  @Get('applicants/:id/person-history')
  getPersonHistory(@Param('id') id: string) {
    return this.service.getPersonHistory(id);
  }
}
