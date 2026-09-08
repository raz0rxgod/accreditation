import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import * as puppeteer from 'puppeteer';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { QrSignerService } from '../../common/qr/qr-signer.service';

const CARD_VALIDITY_FALLBACK_DAYS = 90; // если у анкеты почему-то нет даты окончания поездки

@Injectable()
export class CardsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private qrSigner: QrSignerService,
  ) {}

  /**
   * Генерирует карту для одобренной анкеты. Идемпотентна: если карта уже есть — возвращает её,
   * повторно не создаёт (вызывается автоматически из StatusService при переходе в "approved").
   */
  async generateForApplicant(applicantId: string) {
    const applicant = await this.prisma.applicant.findUnique({
      where: { id: applicantId },
      include: { media: true, accreditationCard: true, application: true },
    });
    if (!applicant) throw new NotFoundException('Анкета не найдена');
    if (applicant.status !== 'approved') {
      throw new BadRequestException('Карта выдаётся только для одобренных анкет');
    }
    if (applicant.accreditationCard) {
      return applicant.accreditationCard;
    }

    const issuedAt = new Date();
    const expiresAt = applicant.tripEnd
      ? new Date(applicant.tripEnd)
      : new Date(Date.now() + CARD_VALIDITY_FALLBACK_DAYS * 24 * 60 * 60 * 1000);

    const accreditationNumber = await this.generateAccreditationNumber();

    // id карты нужен до создания записи в БД, чтобы зашить его в подпись QR —
    // генерируем заранее через Prisma-совместимый uuid.
    const cardId = randomUUID();
    const qrToken = this.qrSigner.sign({
      entity: 'accreditation_card',
      id: cardId,
      exp: Math.floor(expiresAt.getTime() / 1000),
    });

    // QR кодирует не голый токен, а ссылку на публичную страницу верификации —
    // так любое стороннее приложение-камера (не только наша админка) откроет
    // человекочитаемый результат в браузере, а не бессмысленную строку.
    const verifyUrl = `${process.env.FRONTEND_URL}/verify?token=${encodeURIComponent(qrToken)}`;
    const qrImageDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 300 });
    const photoDataUrl = await this.loadPhotoDataUrl(applicant.photoPath);
    const badgePdfBuffer = await this.renderBadgePdf({
      fullName: `${applicant.lastName} ${applicant.firstName} ${applicant.middleName ?? ''}`.trim(),
      media: applicant.media?.name ?? '—',
      accreditationNumber,
      issuedAt,
      expiresAt,
      qrImageDataUrl,
      photoDataUrl,
    });

    const badgePdfPath = await this.storage.upload(
      badgePdfBuffer,
      `badge-${accreditationNumber}.pdf`,
      `cards/${applicantId}`,
      'application/pdf',
    );

    return this.prisma.accreditationCard.create({
      data: {
        id: cardId,
        applicantId,
        accreditationNumber,
        qrToken,
        issuedAt,
        expiresAt,
        badgePdfPath,
        active: true,
      },
    });
  }

  async getForApplicant(applicantId: string) {
    const card = await this.prisma.accreditationCard.findUnique({ where: { applicantId } });
    if (!card) throw new NotFoundException('Карта ещё не выпущена для этой анкеты');

    return { ...card, downloadUrl: await this.storage.getSignedUrl(card.badgePdfPath!) };
  }

  /** Скачивает фото журналиста из MinIO и превращает в data URL для встраивания в PDF.
   *  Подписанная ссылка на MinIO живёт всего несколько минут и не гарантированно доступна
   *  из headless-браузера в момент рендера, поэтому фото встраивается как base64 напрямую
   *  в HTML, а не через <img src="{signedUrl}">. Если фото не загружено — бейдж рисуется без него. */
  private async loadPhotoDataUrl(photoPath: string | null): Promise<string | null> {
    if (!photoPath) return null;
    try {
      const buffer = await this.storage.download(photoPath);
      const ext = photoPath.split('.').pop()?.toLowerCase();
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
      // Фото могло быть удалено из бакета вручную — не блокируем выдачу карты из-за этого.
      return null;
    }
  }

  private async generateAccreditationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.accreditationCard.count({
      where: { issuedAt: { gte: new Date(`${year}-01-01`) } },
    });
    return `ACC-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private async renderBadgePdf(data: {
    fullName: string;
    media: string;
    accreditationNumber: string;
    issuedAt: Date;
    expiresAt: Date;
    qrImageDataUrl: string;
    photoDataUrl: string | null;
  }): Promise<Buffer> {
    const photoBlock = data.photoDataUrl
      ? `<img src="${data.photoDataUrl}" class="photo" />`
      : `<div class="photo photo-placeholder">Фото не загружено</div>`;

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: 'DejaVu Sans', Arial, sans-serif; margin: 0; padding: 32px; }
            .badge { border: 2px solid #1a3c6e; border-radius: 12px; padding: 24px; width: 380px; }
            .header { display: flex; gap: 16px; align-items: flex-start; }
            .photo { width: 96px; height: 120px; object-fit: cover; border-radius: 6px; border: 1px solid #ccc; flex-shrink: 0; }
            .photo-placeholder { display: flex; align-items: center; justify-content: center; text-align: center; font-size: 10px; color: #888; background: #f2f2f2; padding: 4px; }
            .title { font-size: 14px; color: #1a3c6e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
            .name { font-size: 22px; font-weight: bold; margin-bottom: 16px; }
            .row { font-size: 13px; margin-bottom: 6px; color: #333; }
            .row b { color: #000; }
            .qr { text-align: center; margin-top: 16px; }
            .qr img { width: 160px; height: 160px; }
          </style>
        </head>
        <body>
          <div class="badge">
            <div class="header">
              ${photoBlock}
              <div>
                <div class="title">Аккредитация — Портал аккредитации</div>
                <div class="name">${this.escapeHtml(data.fullName)}</div>
              </div>
            </div>
            <div class="row"><b>Организация:</b> ${this.escapeHtml(data.media)}</div>
            <div class="row"><b>Номер:</b> ${data.accreditationNumber}</div>
            <div class="row"><b>Выдана:</b> ${data.issuedAt.toLocaleDateString('ru-RU')}</div>
            <div class="row"><b>Действительна до:</b> ${data.expiresAt.toLocaleDateString('ru-RU')}</div>
            <div class="qr"><img src="${data.qrImageDataUrl}" /></div>
          </div>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfUint8Array = await page.pdf({ width: '450px', height: '620px', printBackground: true });
      return Buffer.from(pdfUint8Array);
    } finally {
      await browser.close();
    }
  }

  private escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c] as string));
  }
}
