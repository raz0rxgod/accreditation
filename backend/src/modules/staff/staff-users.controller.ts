import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StaffUsersService } from './staff-users.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { JwtStaffAuthGuard } from '../../common/guards/jwt-staff-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('staff-users')
@ApiBearerAuth()
@UseGuards(JwtStaffAuthGuard, RolesGuard)
@Roles('admin')
@Controller('staff')
export class StaffUsersController {
  constructor(private readonly service: StaffUsersService) {}

  /** Список сотрудников (только для admin). */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** Завести нового сотрудника — раньше это можно было сделать только через `prisma db seed`. */
  @Post()
  create(@Body() dto: CreateStaffDto) {
    return this.service.create(dto);
  }

  /** Сменить роль / ФИО / деактивировать сотрудника. */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() staff: { staffId: string },
  ) {
    return this.service.update(id, dto, staff.staffId);
  }
}
