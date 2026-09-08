import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QrSignerService } from '../../common/qr/qr-signer.service';
import { ScanQrDto } from './dto/scan-qr.dto';

type ScanResult = 'valid' | 'expired' | 'not_approved';

@Injectable()
export class QrService {
  constructor(
    private prisma: PrismaService,
    private qrSigner: QrSignerService,
  ) {}

  /**
   * Проверяет QR на КПП/таможне, либо публично по ссылке (staffId = null —
   * например, если человека сканирует не сотрудник, а сам QR открыт по ссылке в браузере).
   * Всегда логирует попытку в QrScan — включая невалидные и просроченные токены —
   * это нужно для аудита прохождений.
   */
  async scan(dto: ScanQrDto, staffId: string | null) {
    const payload = this.qrSigner.verify(dto.token);

    if (!payload) {
      // Подпись неверна или срок вышел — детали не раскрываем сканирующему
      // (не даём подсказок для подделки), но сам факт попытки логируем.
      await this.logScan({ result: 'expired', staffId, location: dto.checkpointLocation });
      return { result: 'expired' as ScanResult, message: 'QR-код недействителен или срок истёк' };
    }

    if (payload.entity === 'accreditation_card') {
      return this.scanAccreditationCard(payload.id, staffId, dto.checkpointLocation);
    }

    if (payload.entity === 'equipment_list') {
      return this.scanEquipmentList(payload.id, staffId, dto.checkpointLocation);
    }

    await this.logScan({ result: 'not_approved', staffId, location: dto.checkpointLocation });
    return { result: 'not_approved' as ScanResult, message: 'Неизвестный тип QR-кода' };
  }

  private async scanAccreditationCard(cardId: string, staffId: string | null, location?: string) {
    const card = await this.prisma.accreditationCard.findUnique({
      where: { id: cardId },
      include: { applicant: { include: { media: true } } },
    });

    if (!card) {
      await this.logScan({ result: 'not_approved', staffId, location });
      return { result: 'not_approved' as ScanResult, message: 'Карта не найдена' };
    }

    let result: ScanResult = 'valid';
    if (!card.active || card.applicant.status !== 'approved') result = 'not_approved';
    else if (card.expiresAt < new Date()) result = 'expired';

    await this.logScan({ result, staffId, location, accreditationCardId: card.id });

    return {
      result,
      message: this.messageFor(result),
      applicant:
        result === 'valid'
          ? {
              fullName: `${card.applicant.lastName} ${card.applicant.firstName}`,
              media: card.applicant.media?.name ?? null,
              accreditationNumber: card.accreditationNumber,
              expiresAt: card.expiresAt,
            }
          : undefined,
    };
  }

  private async scanEquipmentList(listId: string, staffId: string | null, location?: string) {
    const list = await this.prisma.equipmentList.findUnique({
      where: { id: listId },
      include: { items: true, application: true },
    });

    if (!list) {
      await this.logScan({ result: 'not_approved', staffId, location });
      return { result: 'not_approved' as ScanResult, message: 'Список техники не найден' };
    }

    // Техника считается подтверждённой, пока заявка в целом одобрена.
    const result: ScanResult = list.application.status === 'approved' ? 'valid' : 'not_approved';

    await this.logScan({ result, staffId, location, equipmentListId: list.id });

    return {
      result,
      message: this.messageFor(result),
      items: result === 'valid' ? list.items : undefined,
    };
  }

  /** История сканирований — для отчётности сотрудников. */
  async getHistory(filters: { accreditationCardId?: string; equipmentListId?: string }) {
    return this.prisma.qrScan.findMany({
      where: filters,
      include: { scannedByStaff: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private async logScan(params: {
    result: ScanResult;
    staffId: string | null;
    location?: string;
    accreditationCardId?: string;
    equipmentListId?: string;
  }) {
    return this.prisma.qrScan.create({
      data: {
        result: params.result,
        scannedByStaffId: params.staffId,
        checkpointLocation: params.location,
        accreditationCardId: params.accreditationCardId,
        equipmentListId: params.equipmentListId,
      },
    });
  }

  private messageFor(result: ScanResult): string {
    switch (result) {
      case 'valid':
        return 'Аккредитация действительна';
      case 'expired':
        return 'Срок действия истёк';
      case 'not_approved':
        return 'Аккредитация не подтверждена или отозвана';
    }
  }
}
