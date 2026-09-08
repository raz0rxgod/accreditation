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
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtEitherAuthGuard } from '../../common/guards/jwt-either-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('documents')
@ApiBearerAuth()
@Controller()
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  /** Загрузить скан документа (PDF/JPG/PNG, до 15 МБ) — только сам заявитель. */
  @UseGuards(JwtAuthGuard)
  @Post('applicants/:applicantId/documents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('applicantId') applicantId: string,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.upload(applicantId, user.userId, dto.type, file);
  }

  /** Список документов анкеты — доступно и заявителю, и сотруднику администрации. */
  @UseGuards(JwtEitherAuthGuard)
  @Get('applicants/:applicantId/documents')
  findAll(@Param('applicantId') applicantId: string, @CurrentUser() who: any) {
    const requester = who.staffId
      ? ({ type: 'staff' } as const)
      : ({ type: 'user', id: who.userId } as const);
    return this.service.findAllForApplicant(applicantId, requester);
  }

  /** Удалить документ (пока заявка не отправлена) — только сам заявитель. */
  @UseGuards(JwtAuthGuard)
  @Delete('documents/:id')
  remove(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.service.remove(id, user.userId);
  }
}
