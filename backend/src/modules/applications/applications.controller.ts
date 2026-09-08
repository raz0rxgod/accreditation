import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtStaffAuthGuard } from '../../common/guards/jwt-staff-auth.guard';
import { JwtEitherAuthGuard } from '../../common/guards/jwt-either-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('applications')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}

  /** Создать новую групповую заявку (черновик). */
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: { userId: string }) {
    return this.service.create(user.userId);
  }

  /** Список заявок текущего пользователя. */
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@CurrentUser() user: { userId: string }) {
    return this.service.findAllForUser(user.userId);
  }

  /** Список всех заявок — для сотрудников, с фильтром по статусу. */
  @UseGuards(JwtStaffAuthGuard)
  @Get('staff/all')
  findAllForStaff(@Query('status') status?: string) {
    return this.service.findAllForStaff(status);
  }

  /** Детали одной заявки (со всеми анкетами) — доступно и заявителю, и сотруднику. */
  @UseGuards(JwtEitherAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    // Ручная проверка вместо двух гвардов: пробуем определить, кто стучится,
    // по наличию соответствующего токена. Простое решение для двух разных ролей на одном роуте.
    if (user?.role) {
      return this.service.findOne(id, { isStaff: true });
    }
    return this.service.findOne(id, { userId: user.userId });
  }

  /** Отправить заявку на рассмотрение администрации. */
  @UseGuards(JwtAuthGuard)
  @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.service.submit(id, user.userId);
  }
}
