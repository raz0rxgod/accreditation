import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client } from 'minio';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private client: Client; // для внутренних операций (upload/delete) — сервер обращается к MinIO сам
  private publicClient: Client; // только для генерации ссылок, которые открывает браузер пользователя
  private bucket = process.env.S3_BUCKET || 'mid-accreditation-files';

  onModuleInit() {
    this.client = new Client({
      endPoint: process.env.S3_ENDPOINT || 'localhost',
      port: Number(process.env.S3_PORT) || 9000,
      useSSL: process.env.S3_USE_SSL === 'true',
      accessKey: process.env.S3_ACCESS_KEY,
      secretKey: process.env.S3_SECRET_KEY,
    });

    // Подписанные ссылки должны указывать на адрес, доступный из браузера пользователя —
    // это не всегда совпадает с адресом, по которому backend сам обращается к MinIO
    // (например, backend ходит по "localhost" или "minio" внутри docker-сети,
    // а пользователю нужна публичная ссылка вида http://<IP-сервера>:9000/...).
    // Если S3_PUBLIC_ENDPOINT не задан — используем тот же адрес, что и для внутренних операций.
    this.publicClient = new Client({
      endPoint: process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT || 'localhost',
      port: Number(process.env.S3_PUBLIC_PORT || process.env.S3_PORT) || 9000,
      useSSL: process.env.S3_PUBLIC_USE_SSL === 'true' || process.env.S3_USE_SSL === 'true',
      accessKey: process.env.S3_ACCESS_KEY,
      secretKey: process.env.S3_SECRET_KEY,
    });
  }

  /**
   * Загружает буфер в бакет и возвращает ключ объекта (storage_path).
   * mimetype обязателен: без него MinIO хранит объект как application/octet-stream,
   * из-за чего браузер всегда скачивает файл вместо показа inline (img/iframe).
   */
  async upload(buffer: Buffer, originalName: string, folder: string, mimetype: string): Promise<string> {
    const ext = originalName.includes('.') ? originalName.split('.').pop() : 'bin';
    const key = `${folder}/${randomUUID()}.${ext}`;

    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': mimetype,
    });
    return key;
  }

  /** Временная подписанная ссылка на скачивание (по умолчанию 15 минут), с публичным хостом. */
  async getSignedUrl(key: string, expirySeconds = 900): Promise<string> {
    return this.publicClient.presignedGetObject(this.bucket, key, expirySeconds);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  /** Скачивает объект целиком в память — нужен для встраивания (например, фото в PDF-бейдж). */
  async download(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }
}
