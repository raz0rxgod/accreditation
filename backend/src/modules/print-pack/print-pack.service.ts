import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';

// Печатный пакет складывается в PDF постранично; изображения вписываются в лист A4,
// чтобы пакет было удобно печатать даже если сканы разного размера/ориентации.
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PACK_LINK_EXPIRY_SECONDS = 3600; // час — сотруднику нужно успеть открыть/распечатать, не 15 минут как для обычного документа

interface StoredFile {
  key: string;
  filename: string;
}

@Injectable()
export class PrintPackService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  /**
   * Собирает один PDF из документов всех анкет заявки (в порядке добавления анкет),
   * плюс аккредитационный бейдж, если анкета уже одобрена. Файлы, которые не удалось
   * скачать или распознать (повреждённые/неизвестного формата), пропускаются —
   * это не должно ронять формирование всего пакета из-за одного проблемного файла.
   */
  async generate(applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        applicants: {
          orderBy: { createdAt: 'asc' },
          include: { documents: true, accreditationCard: true },
        },
      },
    });
    if (!application) throw new NotFoundException('Заявка не найдена');
    if (application.applicants.length === 0) {
      throw new BadRequestException('В заявке нет ни одной анкеты');
    }

    const merged = await PDFDocument.create();
    let pagesAdded = 0;

    for (const applicant of application.applicants) {
      const files: StoredFile[] = applicant.documents.map((doc) => ({
        key: doc.storagePath,
        filename: doc.filename,
      }));
      if (applicant.accreditationCard?.badgePdfPath) {
        files.push({ key: applicant.accreditationCard.badgePdfPath, filename: 'badge.pdf' });
      }

      for (const file of files) {
        try {
          pagesAdded += await this.appendFile(merged, file);
        } catch (err) {
          // Не блокируем весь пакет из-за одного нечитаемого файла — просто пропускаем его.
          console.error(`Печатный пакет ${applicationId}: не удалось встроить ${file.key}`, err);
        }
      }
    }

    if (pagesAdded === 0) {
      throw new BadRequestException(
        'Нет ни одного документа для печати — сначала загрузите документы участников',
      );
    }

    const mergedBytes = await merged.save();
    const key = await this.storage.upload(
      Buffer.from(mergedBytes),
      `print-pack-${application.applicationNumber}.pdf`,
      `print-packs/${applicationId}`,
      'application/pdf',
    );

    return {
      downloadUrl: await this.storage.getSignedUrl(key, PACK_LINK_EXPIRY_SECONDS),
      pagesCount: pagesAdded,
      applicantsCount: application.applicants.length,
    };
  }

  private async appendFile(merged: PDFDocument, file: StoredFile): Promise<number> {
    const bytes = await this.storage.download(file.key);
    const ext = file.filename.split('.').pop()?.toLowerCase();

    if (ext === 'pdf') {
      const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copiedPages = await merged.copyPages(source, source.getPageIndices());
      copiedPages.forEach((page) => merged.addPage(page));
      return copiedPages.length;
    }

    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
      const image = ext === 'png' ? await merged.embedPng(bytes) : await merged.embedJpg(bytes);
      const scale = Math.min(A4_WIDTH / image.width, A4_HEIGHT / image.height, 1);
      const width = image.width * scale;
      const height = image.height * scale;

      const page = merged.addPage([A4_WIDTH, A4_HEIGHT]);
      page.drawImage(image, {
        x: (A4_WIDTH - width) / 2,
        y: (A4_HEIGHT - height) / 2,
        width,
        height,
      });
      return 1;
    }

    // Неизвестный формат (не должно случаться — при загрузке документов разрешены только
    // PDF/JPG/PNG), но на всякий случай не роняем весь пакет.
    return 0;
  }
}
