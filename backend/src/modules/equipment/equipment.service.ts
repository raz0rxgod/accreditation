import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { QrSignerService } from '../../common/qr/qr-signer.service';
import { EquipmentItemDto } from './dto/add-equipment-items.dto';

const QR_VALIDITY_FALLBACK_DAYS = 90;

@Injectable()
export class EquipmentService {
  constructor(
    private prisma: PrismaService,
    private qrSigner: QrSignerService,
  ) {}

  /** Добавляет технику в список заявки, создавая список при первом обращении. */
  async addItems(applicationId: string, userId: string, items: EquipmentItemDto[]) {
    const application = await this.assertOwnedDraft(applicationId, userId);

    const list = await this.prisma.equipmentList.upsert({
      where: { applicationId },
      update: {},
      create: { applicationId, qrToken: `pending-${randomUUID()}` }, // реальный токен проставится при первой генерации QR
    });

    await this.prisma.equipmentItem.createMany({
      data: items.map((item) => ({
        equipmentListId: list.id,
        category: item.category,
        brand: item.brand,
        model: item.model,
        serialNumber: item.serialNumber,
      })),
    });

    return this.getForApplication(applicationId, { type: 'user', id: userId });
  }

  async removeItem(itemId: string, userId: string) {
    const item = await this.prisma.equipmentItem.findUnique({
      where: { id: itemId },
      include: { equipmentList: { include: { application: true } } },
    });
    if (!item) throw new NotFoundException('Позиция не найдена');
    if (item.equipmentList.application.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому списку техники');
    }
    if (item.equipmentList.application.status !== 'draft') {
      throw new BadRequestException('Редактирование недоступно после отправки заявки');
    }

    await this.prisma.equipmentItem.delete({ where: { id: itemId } });
    return { message: 'Позиция удалена' };
  }

  async getForApplication(
    applicationId: string,
    requester: { type: 'user'; id: string } | { type: 'staff' },
  ) {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) throw new NotFoundException('Заявка не найдена');
    if (requester.type === 'user' && application.userId !== requester.id) {
      throw new ForbiddenException('Нет доступа к этой заявке');
    }

    const list = await this.prisma.equipmentList.findUnique({
      where: { applicationId },
      include: { items: true },
    });
    if (!list) return { items: [], qrToken: null };
    return list;
  }

  /**
   * Генерирует (или перегенерирует) подписанный QR для списка техники —
   * логично делать это при отправке заявки, либо вручную сотрудником, если список менялся.
   * Срок действия — по максимальной дате окончания поездки среди участников заявки,
   * либо запасные 90 дней, если даты почему-то не указаны.
   */
  async generateQr(applicationId: string, userId: string) {
    await this.assertOwned(applicationId, userId);

    const list = await this.prisma.equipmentList.findUnique({ where: { applicationId } });
    if (!list) {
      throw new BadRequestException('Сначала добавьте технику в список');
    }

    const applicants = await this.prisma.applicant.findMany({
      where: { applicationId },
      select: { tripEnd: true },
    });
    const latestTripEnd = applicants.reduce<Date | null>((latest, a) => {
      if (!a.tripEnd) return latest;
      return !latest || a.tripEnd > latest ? a.tripEnd : latest;
    }, null);
    const expiresAt =
      latestTripEnd ?? new Date(Date.now() + QR_VALIDITY_FALLBACK_DAYS * 24 * 60 * 60 * 1000);

    const qrToken = this.qrSigner.sign({
      entity: 'equipment_list',
      id: list.id,
      exp: Math.floor(expiresAt.getTime() / 1000),
    });

    return this.prisma.equipmentList.update({
      where: { id: list.id },
      data: { qrToken },
      include: { items: true },
    });
  }

  private async assertOwned(applicationId: string, userId: string) {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) throw new NotFoundException('Заявка не найдена');
    if (application.userId !== userId) throw new ForbiddenException('Нет доступа к этой заявке');
    return application;
  }

  private async assertOwnedDraft(applicationId: string, userId: string) {
    const application = await this.assertOwned(applicationId, userId);
    if (application.status !== 'draft') {
      throw new BadRequestException('Изменение списка техники недоступно после отправки заявки');
    }
    return application;
  }
}
