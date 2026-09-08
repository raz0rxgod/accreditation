import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { UpsertApplicantDto } from './dto/upsert-applicant.dto';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 МБ
const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png'];

@Injectable()
export class ApplicantsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async create(applicationId: string, userId: string, dto: UpsertApplicantDto) {
    const application = await this.assertOwnedDraft(applicationId, userId);

    const personId = await this.matchOrCreatePerson(dto);

    return this.prisma.applicant.create({
      data: {
        applicationId: application.id,
        personId,
        lastName: dto.lastName,
        firstName: dto.firstName,
        middleName: dto.middleName,
        mediaId: dto.mediaId,
        position: dto.position,
        employerAddress: dto.employerAddress,
        citizenshipCountryId: dto.citizenshipCountryId,
        visitedBefore: dto.visitedBefore ?? false,
        visitPurpose: dto.visitPurpose,
        tripStart: dto.tripStart ? new Date(dto.tripStart) : undefined,
        tripEnd: dto.tripEnd ? new Date(dto.tripEnd) : undefined,
        accommodation: dto.accommodation,
        phone: dto.phone,
        email: dto.email,
        passportNumber: dto.passportNumber,
        passportExpiry: dto.passportExpiry ? new Date(dto.passportExpiry) : undefined,
        visaFree: dto.visaFree ?? false,
        visaNumber: dto.visaNumber,
        visaExpiry: dto.visaExpiry ? new Date(dto.visaExpiry) : undefined,
        noPressCard: dto.noPressCard ?? false,
        pressCardExpiry: dto.pressCardExpiry ? new Date(dto.pressCardExpiry) : undefined,
        priorCoverageLinks: dto.priorCoverageLinks,
        status: 'new',
      },
    });
  }

  async update(applicantId: string, userId: string, dto: UpsertApplicantDto) {
    const applicant = await this.findWithOwnershipCheck(applicantId, userId);
    if (applicant.application.status !== 'draft') {
      throw new BadRequestException('Редактирование недоступно после отправки заявки');
    }

    return this.prisma.applicant.update({
      where: { id: applicantId },
      data: {
        lastName: dto.lastName,
        firstName: dto.firstName,
        middleName: dto.middleName,
        mediaId: dto.mediaId,
        position: dto.position,
        employerAddress: dto.employerAddress,
        citizenshipCountryId: dto.citizenshipCountryId,
        visitedBefore: dto.visitedBefore,
        visitPurpose: dto.visitPurpose,
        tripStart: dto.tripStart ? new Date(dto.tripStart) : undefined,
        tripEnd: dto.tripEnd ? new Date(dto.tripEnd) : undefined,
        accommodation: dto.accommodation,
        phone: dto.phone,
        email: dto.email,
        passportNumber: dto.passportNumber,
        passportExpiry: dto.passportExpiry ? new Date(dto.passportExpiry) : undefined,
        visaFree: dto.visaFree,
        visaNumber: dto.visaNumber,
        visaExpiry: dto.visaExpiry ? new Date(dto.visaExpiry) : undefined,
        noPressCard: dto.noPressCard,
        pressCardExpiry: dto.pressCardExpiry ? new Date(dto.pressCardExpiry) : undefined,
        priorCoverageLinks: dto.priorCoverageLinks,
      },
    });
  }

  async remove(applicantId: string, userId: string) {
    const applicant = await this.findWithOwnershipCheck(applicantId, userId);
    if (applicant.application.status !== 'draft') {
      throw new BadRequestException('Удаление недоступно после отправки заявки');
    }
    await this.prisma.applicant.delete({ where: { id: applicantId } });
    return { message: 'Анкета удалена' };
  }

  /** Загрузить/заменить фото журналиста для бейджа (только заявитель, только пока заявка — черновик). */
  async uploadPhoto(applicantId: string, userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл не передан');
    if (!ALLOWED_PHOTO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Допустимы только JPG и PNG файлы');
    }
    if (file.size > MAX_PHOTO_SIZE) {
      throw new BadRequestException('Файл превышает допустимый размер 5 МБ');
    }

    const applicant = await this.findWithOwnershipCheck(applicantId, userId);
    if (applicant.application.status !== 'draft') {
      throw new BadRequestException('Загрузка фото недоступна после отправки заявки');
    }

    const previousPhotoPath = applicant.photoPath;
    const storagePath = await this.storage.upload(
      file.buffer,
      file.originalname,
      `applicants/${applicantId}/photo`,
      file.mimetype,
    );

    const updated = await this.prisma.applicant.update({
      where: { id: applicantId },
      data: { photoPath: storagePath },
    });

    // Не блокируем ответ на удаление старого файла — если оно не удастся, в бакете
    // просто останется висеть неиспользуемый объект, это не критично.
    if (previousPhotoPath) {
      this.storage.delete(previousPhotoPath).catch(() => {});
    }

    return { ...updated, photoUrl: await this.storage.getSignedUrl(updated.photoPath!) };
  }

  async findAllForApplication(applicationId: string, userId: string) {
    await this.assertOwned(applicationId, userId);
    return this.prisma.applicant.findMany({
      where: { applicationId },
      include: { documents: true, media: true, citizenshipCountry: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── вспомогательные методы ──────────────────────────────────

  private async assertOwned(applicationId: string, userId: string) {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) throw new NotFoundException('Заявка не найдена');
    if (application.userId !== userId) throw new ForbiddenException('Нет доступа к этой заявке');
    return application;
  }

  private async assertOwnedDraft(applicationId: string, userId: string) {
    const application = await this.assertOwned(applicationId, userId);
    if (application.status !== 'draft') {
      throw new BadRequestException('Добавление участников недоступно после отправки заявки');
    }
    return application;
  }

  private async findWithOwnershipCheck(applicantId: string, userId: string) {
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

  /**
   * Ищет "мягкое" совпадение журналиста по нормализованному ФИО + номеру паспорта.
   * При совпадении привязывает анкету к существующей записи Person (история обращений),
   * иначе создаёт новую запись Person. Это эвристика для сотрудника администрации, не жёсткая связь —
   * окончательное решение "тот же человек или нет" всё равно принимает сотрудник вручную.
   */
  private async matchOrCreatePerson(dto: UpsertApplicantDto): Promise<string | undefined> {
    if (!dto.lastName || !dto.firstName) return undefined;

    const normalized = this.normalizeFullName(dto.lastName, dto.firstName, dto.middleName);

    const existing = dto.passportNumber
      ? await this.prisma.person.findFirst({
          where: {
            fullNameNormalized: normalized,
            passportNumber: dto.passportNumber,
          },
        })
      : await this.prisma.person.findFirst({ where: { fullNameNormalized: normalized } });

    if (existing) return existing.id;

    const created = await this.prisma.person.create({
      data: {
        fullNameNormalized: normalized,
        passportNumber: dto.passportNumber,
        email: dto.email,
      },
    });
    return created.id;
  }

  private normalizeFullName(lastName: string, firstName: string, middleName?: string): string {
    return [lastName, firstName, middleName ?? '']
      .join(' ')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }
}
