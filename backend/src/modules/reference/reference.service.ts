import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMediaOrganizationDto, MediaTypeDto } from './dto/create-media-organization.dto';

@Injectable()
export class ReferenceService {
  constructor(private prisma: PrismaService) {}

  getCountries() {
    return this.prisma.country.findMany({ orderBy: { name: 'asc' } });
  }

  /** Список организаций, с опциональным поиском по названию (для автокомплита на форме). */
  getMediaOrganizations(search?: string) {
    return this.prisma.mediaOrganization.findMany({
      where: search
        ? { name: { contains: search, mode: 'insensitive' } }
        : undefined,
      include: { country: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  /**
   * Создаёт организацию, если заявитель не нашёл её в списке — с базовой защитой от дублей
   * по точному совпадению названия (без учёта регистра). Если организация уже существует,
   * но у него ещё не проставлен mediaType, а в запросе он пришёл — дозаполняем,
   * не создавая дубль и не требуя отдельного шага от сотрудника администрации.
   */
  async createMediaOrganization(dto: CreateMediaOrganizationDto) {
    const existing = await this.prisma.mediaOrganization.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (existing) {
      if (!existing.mediaType && dto.mediaType) {
        return this.prisma.mediaOrganization.update({
          where: { id: existing.id },
          data: { mediaType: dto.mediaType },
        });
      }
      return existing;
    }

    return this.prisma.mediaOrganization.create({
      data: {
        name: dto.name,
        countryId: dto.countryId,
        website: dto.website,
        registrationNumber: dto.registrationNumber,
        mediaType: dto.mediaType,
      },
    });
  }

  /** Проставить/поменять тип организации на уже существующей записи — для сотрудника администрации. */
  async updateMediaOrganization(id: string, mediaType: MediaTypeDto) {
    return this.prisma.mediaOrganization.update({
      where: { id },
      data: { mediaType },
    });
  }
}
