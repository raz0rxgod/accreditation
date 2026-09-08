import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtStaffAuthGuard } from '../../common/guards/jwt-staff-auth.guard';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtStaffAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  /** Аккредитованные журналисты, находящиеся в стране прямо сейчас (по датам поездки). */
  @Get('currently-in-country')
  currentlyInCountry() {
    return this.service.currentlyInCountry();
  }

  /** Процентное соотношение ТВ/Печать/Радио/Другое среди одобренных анкет. */
  @Get('media-type-breakdown')
  mediaTypeBreakdown() {
    return this.service.mediaTypeBreakdown();
  }

  /** Материалы, загруженные журналистами, сгруппированные по месяцу загрузки. */
  @Get('materials-by-month')
  materialsByMonth() {
    return this.service.materialsByMonth();
  }
}
