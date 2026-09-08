import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReferenceService } from './reference.service';
import { CreateMediaOrganizationDto } from './dto/create-media-organization.dto';
import { UpdateMediaOrganizationDto } from './dto/update-media-organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtStaffAuthGuard } from '../../common/guards/jwt-staff-auth.guard';

@ApiTags('reference')
@Controller()
export class ReferenceController {
  constructor(private readonly service: ReferenceService) {}

  /** Справочник стран — публичный, нужен и на форме регистрации, и в анкете. */
  @Get('countries')
  getCountries() {
    return this.service.getCountries();
  }

  /** Список организаций с поиском по названию — публичный, для автокомплита в анкете. */
  @Get('media-organizations')
  getMediaOrganizations(@Query('search') search?: string) {
    return this.service.getMediaOrganizations(search);
  }

  /** Добавить организацию, если её нет в справочнике — только для авторизованных заявителей. */
  @UseGuards(JwtAuthGuard)
  @Post('media-organizations')
  createMediaOrganization(@Body() dto: CreateMediaOrganizationDto) {
    return this.service.createMediaOrganization(dto);
  }

  /** Проставить/поменять тип организации (для отчёта по аналитике) — любой сотрудник администрации. */
  @UseGuards(JwtStaffAuthGuard)
  @Patch('media-organizations/:id')
  updateMediaOrganization(@Param('id') id: string, @Body() dto: UpdateMediaOrganizationDto) {
    return this.service.updateMediaOrganization(id, dto.mediaType);
  }
}
