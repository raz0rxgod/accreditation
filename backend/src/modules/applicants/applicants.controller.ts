import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ApplicantsService } from './applicants.service';
import { UpsertApplicantDto } from './dto/upsert-applicant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('applicants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ApplicantsController {
  constructor(private readonly service: ApplicantsService) {}

  /** Добавить участника в групповую заявку (только пока заявка в статусе "черновик"). */
  @Post('applications/:applicationId/applicants')
  create(
    @Param('applicationId') applicationId: string,
    @Body() dto: UpsertApplicantDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.create(applicationId, user.userId, dto);
  }

  /** Список анкет в заявке. */
  @Get('applications/:applicationId/applicants')
  findAll(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.findAllForApplication(applicationId, user.userId);
  }

  /** Обновить анкету участника. */
  @Patch('applicants/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpsertApplicantDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.update(id, user.userId, dto);
  }

  /** Удалить анкету участника (пока заявка не отправлена). */
  @Delete('applicants/:id')
  remove(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.service.remove(id, user.userId);
  }

  /** Загрузить/заменить фото журналиста (JPG/PNG, до 5 МБ) — используется на бейдже. */
  @Post('applicants/:id/photo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.uploadPhoto(id, user.userId, file);
  }
}
