import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

interface QrPayload {
  entity: 'accreditation_card' | 'equipment_list';
  id: string;
  exp: number; // unix timestamp секунд
}

@Injectable()
export class QrSignerService {
  private secret = process.env.QR_SIGNING_SECRET || '';

  /** Формирует компактный подписанный токен вида base64(payload).base64(signature). */
  sign(payload: QrPayload): string {
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = this.computeSignature(payloadB64);
    return `${payloadB64}.${signature}`;
  }

  /**
   * Проверяет токен: корректность подписи и срок действия.
   * Возвращает распарсенный payload, либо null если токен невалиден/просрочен.
   */
  verify(token: string): QrPayload | null {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;

    const expectedSignature = this.computeSignature(payloadB64);
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSignature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    try {
      const payload: QrPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
      if (payload.exp * 1000 < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }

  private computeSignature(payloadB64: string): string {
    return createHmac('sha256', this.secret).update(payloadB64).digest('base64url');
  }
}
