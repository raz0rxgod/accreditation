import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { JwtEitherAuthGuard } from '../../common/guards/jwt-either-auth.guard';
import { JwtStaffAuthGuard } from '../../common/guards/jwt-staff-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('cards')
@ApiBearerAuth()
@Controller('applicants/:id/card')
export class CardsController {
  constructor(private readonly service: CardsService) {}

  /** Получить карту (с временной ссылкой на PDF) — доступно и заявителю, и сотруднику. */
  @UseGuards(JwtEitherAuthGuard)
  @Get()
  get(@Param('id') applicantId: string) {
    return this.service.getForApplicant(applicantId);
  }

  /** Принудительно перегенерировать/создать карту вручную (на случай сбоя автогенерации). */
  @UseGuards(JwtStaffAuthGuard, RolesGuard)
  @Roles('mfa_officer', 'admin')
  @Post()
  generate(@Param('id') applicantId: string) {
    return this.service.generateForApplicant(applicantId);
  }
}
