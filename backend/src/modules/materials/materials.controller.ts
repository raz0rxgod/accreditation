import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtEitherAuthGuard } from '../../common/guards/jwt-either-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('materials')
@ApiBearerAuth()
@Controller()
export class MaterialsController {
  constructor(private readonly service: MaterialsService) {}

  /** Добавить ссылку на опубликованный материал — только сам заявитель, только по одобренной анкете. */
  @UseGuards(JwtAuthGuard)
  @Post('applicants/:applicantId/materials')
  addUrl(
    @Param('applicantId') applicantId: string,
    @Body() dto: CreateMaterialDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.addUrl(applicantId, user.userId, dto.url);
  }

  /** Загрузить PDF-отчёт по итогам поездки — тот же эндпоинт, но как файл. */
  @UseGuards(JwtAuthGuard)
  @Post('applicants/:applicantId/materials/upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadPdf(
    @Param('applicantId') applicantId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.uploadPdf(applicantId, user.userId, file);
  }

  /** Список материалов анкеты — доступно и заявителю, и сотруднику администрации. */
  @UseGuards(JwtEitherAuthGuard)
  @Get('applicants/:applicantId/materials')
  findAll(@Param('applicantId') applicantId: string, @CurrentUser() who: any) {
    const requester = who.staffId
      ? ({ type: 'staff' } as const)
      : ({ type: 'user', id: who.userId } as const);
    return this.service.findAllForApplicant(applicantId, requester);
  }

  /** Удалить материал — только сам заявитель. */
  @UseGuards(JwtAuthGuard)
  @Delete('materials/:id')
  remove(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.service.remove(id, user.userId);
  }
}
