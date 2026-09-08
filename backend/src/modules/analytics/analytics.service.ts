import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  /**
   * Список аккредитованных журналистов, находящихся в стране прямо сейчас:
   * анкета одобрена и текущая дата попадает в диапазон [tripStart, tripEnd].
   * Анкеты без указанных дат поездки (tripStart/tripEnd не заполнены) в отчёт
   * не попадают — по ним невозможно определить, находится ли человек в стране.
   */
  async currentlyInCountry() {
    const now = new Date();
    const applicants = await this.prisma.applicant.findMany({
      where: {
        status: 'approved',
        tripStart: { lte: now },
        tripEnd: { gte: now },
      },
      include: {
        media: true,
        citizenshipCountry: true,
        application: { select: { applicationNumber: true } },
      },
      orderBy: { tripEnd: 'asc' },
    });

    return applicants.map((a) => ({
      applicantId: a.id,
      lastName: a.lastName,
      firstName: a.firstName,
      middleName: a.middleName,
      media: a.media?.name ?? null,
      citizenshipCountry: a.citizenshipCountry?.name ?? null,
      tripStart: a.tripStart,
      tripEnd: a.tripEnd,
      applicationNumber: a.application.applicationNumber,
    }));
  }

  /**
   * Процентное соотношение Телевидение/Печатные издания/Радио/Другое среди
   * одобренных анкет — считаем по типу организации, к которой привязан заявитель
   * (не по количеству самих организаций). У организаций без проставленного mediaType
   * или у анкет без привязанной организации — попадают в отдельный бакет "не указано",
   * чтобы не искажать проценты по трём основным категориям молча.
   */
  async mediaTypeBreakdown() {
    const applicants = await this.prisma.applicant.findMany({
      where: { status: 'approved' },
      select: { media: { select: { mediaType: true } } },
    });

    const counts: Record<string, number> = {
      television: 0,
      print: 0,
      radio: 0,
      other: 0,
      unspecified: 0,
    };

    for (const a of applicants) {
      const type = a.media?.mediaType;
      if (type && counts[type] !== undefined) {
        counts[type] += 1;
      } else {
        counts.unspecified += 1;
      }
    }

    const total = applicants.length;
    const breakdown = Object.entries(counts).map(([type, count]) => ({
      type,
      count,
      percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }));

    return { total, breakdown };
  }

  /**
   * Список материалов по месяцам загрузки. Для type='url' ссылка — это сам url;
   * для type='pdf' генерируем подписанную ссылку на час (как в print-pack) —
   * отчёт может открываться надолго, короткий TTL документов (15 мин) тут неудобен.
   */
  async materialsByMonth() {
    const materials = await this.prisma.material.findMany({
      include: {
        applicant: {
          select: { lastName: true, firstName: true, media: { select: { name: true } } },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    const groups = new Map<string, typeof materials>();
    for (const m of materials) {
      const key = `${m.uploadedAt.getFullYear()}-${String(m.uploadedAt.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }

    const monthEntries = Array.from(groups.entries()).sort(([a], [b]) => (a < b ? 1 : -1));

    return Promise.all(
      monthEntries.map(async ([month, items]) => ({
        month,
        items: await Promise.all(
          items.map(async (m) => ({
            id: m.id,
            type: m.type,
            link: m.type === 'url' ? m.url : m.filePath ? await this.storage.getSignedUrl(m.filePath, 3600) : null,
            journalist: `${m.applicant.lastName} ${m.applicant.firstName}`,
            media: m.applicant.media?.name ?? null,
            uploadedAt: m.uploadedAt,
          })),
        ),
      })),
    );
  }
}
