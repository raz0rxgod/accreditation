import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 МБ — тот же лимит, что и для документов анкеты

@Injectable()
export class MaterialsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  /** Добавить ссылку на опубликованный материал. */
  async addUrl(applicantId: string, userId: string, url: string) {
    if (!url) throw new BadRequestException('Не передан url');
    await this.assertOwnershipAndEligibility(applicantId, userId);

    return this.prisma.material.create({
      data: { applicantId, type: 'url', url },
    });
  }

  /** Загрузить PDF-отчёт по итогам поездки. */
  async uploadPdf(applicantId: string, userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл не передан');
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Допустим только PDF-файл');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Файл превышает допустимый размер 15 МБ');
    }
    await this.assertOwnershipAndEligibility(applicantId, userId);

    const filePath = await this.storage.upload(
      file.buffer,
      file.originalname,
      `materials/${applicantId}`,
      file.mimetype,
    );

    return this.prisma.material.create({
      data: { applicantId, type: 'pdf', filePath },
    });
  }

  /** Список материалов анкеты — доступен и заявителю (свои), и любому сотруднику администрации. */
  async findAllForApplicant(
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

    const materials = await this.prisma.material.findMany({
      where: { applicantId },
      orderBy: { uploadedAt: 'desc' },
    });

    return Promise.all(
      materials.map(async (m) => ({
        ...m,
        downloadUrl: m.filePath ? await this.storage.getSignedUrl(m.filePath) : null,
      })),
    );
  }

  async remove(materialId: string, userId: string) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
      include: { applicant: { include: { application: true } } },
    });
    if (!material) throw new NotFoundException('Материал не найден');
    if (material.applicant.application.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому материалу');
    }

    if (material.filePath) {
      await this.storage.delete(material.filePath);
    }
    await this.prisma.material.delete({ where: { id: materialId } });
    return { message: 'Материал удалён' };
  }

  /**
   * Материалы принимаются только по одобренной анкете (журналист уже съездил
   * и отчитывается по итогам поездки) — до одобрения вкладка недоступна на фронте,
   * но проверяем и на бэке, чтобы не полагаться только на UI.
   */
  private async assertOwnershipAndEligibility(applicantId: string, userId: string) {
    const applicant = await this.prisma.applicant.findUnique({
      where: { id: applicantId },
      include: { application: true },
    });
    if (!applicant) throw new NotFoundException('Анкета не найдена');
    if (applicant.application.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этой анкете');
    }
    if (applicant.status !== 'approved') {
      throw new BadRequestException('Загрузка материалов доступна только по одобренной анкете');
    }
    return applicant;
  }
}
