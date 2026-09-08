import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { DocumentTypeDto } from './dto/upload-document.dto';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 МБ
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async upload(
    applicantId: string,
    userId: string,
    type: DocumentTypeDto,
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Файл не передан');
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Файл превышает допустимый размер 15 МБ');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Допустимы только PDF, JPG и PNG файлы');
    }

    const applicant = await this.prisma.applicant.findUnique({
      where: { id: applicantId },
      include: { application: true },
    });
    if (!applicant) throw new NotFoundException('Анкета не найдена');
    if (applicant.application.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этой анкете');
    }
    if (applicant.application.status !== 'draft') {
      throw new BadRequestException('Загрузка документов недоступна после отправки заявки');
    }

    const storagePath = await this.storage.upload(
      file.buffer,
      file.originalname,
      `applicants/${applicantId}`,
      file.mimetype,
    );

    return this.prisma.document.create({
      data: {
        applicantId,
        type,
        filename: file.originalname,
        storagePath,
        fileSize: BigInt(file.size),
      },
    });
  }

  /** Просмотр документов — доступен и заявителю (свои), и любому сотруднику администрации. */
  async findAllForApplicant(
    applicantId: string,
    requester: { type: 'user'; id: string } | { type: 'staff' },
  ) {
    await this.assertViewAccess(applicantId, requester);
    const documents = await this.prisma.document.findMany({
      where: { applicantId },
      orderBy: { uploadedAt: 'desc' },
    });

    return Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        fileSize: doc.fileSize.toString(), // BigInt не сериализуется в JSON напрямую
        downloadUrl: await this.storage.getSignedUrl(doc.storagePath),
      })),
    );
  }

  async remove(documentId: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { applicant: { include: { application: true } } },
    });
    if (!document) throw new NotFoundException('Документ не найден');
    if (document.applicant.application.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому документу');
    }
    if (document.applicant.application.status !== 'draft') {
      throw new BadRequestException('Удаление документов недоступно после отправки заявки');
    }

    await this.storage.delete(document.storagePath);
    await this.prisma.document.delete({ where: { id: documentId } });
    return { message: 'Документ удалён' };
  }

  private async assertOwnership(applicantId: string, userId: string) {
    const applicant = await this.prisma.applicant.findUnique({
      where: { id: applicantId },
      include: { application: true },
    });
    if (!applicant) throw new NotFoundException('Анкета не найдена');
    if (applicant.application.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этой анкете');
    }
    return applicant;
  }

  private async assertViewAccess(
    applicantId: string,
    requester: { type: 'user'; id: string } | { type: 'staff' },
  ) {
    const applicant = await this.prisma.applicant.findUnique({
      where: { id: applicantId },
      include: { application: true },
    });
    if (!applicant) throw new NotFoundException('Анкета не найдена');
    if (requester.type === 'user' && applicant.application.userId !== requester.id) {
      throw new ForbiddenException('Нет доступа к этой анкете');
    }
    return applicant;
  }
}
