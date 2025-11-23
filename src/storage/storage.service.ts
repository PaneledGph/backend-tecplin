import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket = process.env.STORAGE_BUCKET;
  private readonly publicBaseUrl = process.env.STORAGE_PUBLIC_URL;
  private readonly client: S3Client;
  private readonly endpoint: string | undefined;

  constructor() {
    const accessKeyId = process.env.STORAGE_ACCESS_KEY;
    const secretAccessKey = process.env.STORAGE_SECRET_KEY;
    const accountId = process.env.STORAGE_ACCOUNT_ID;
    this.endpoint =
      process.env.STORAGE_ENDPOINT ||
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

    if (!this.bucket || !accessKeyId || !secretAccessKey || !this.endpoint) {
      this.logger.warn(
        '⚠️ StorageService no está completamente configurado. Revisa las variables STORAGE_*',
      );
    }

    this.client = new S3Client({
      region: process.env.STORAGE_REGION || 'auto',
      endpoint: this.endpoint,
      forcePathStyle: true, // Cloudflare R2 requiere path-style
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  async uploadFile(key: string, buffer: Buffer, contentType?: string) {
    if (!this.bucket) {
      throw new Error('STORAGE_BUCKET no configurado');
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return {
      key,
      url: this.getPublicUrl(key),
    };
  }

  async deleteFile(key: string) {
    if (!this.bucket) {
      return;
    }

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getObjectBuffer(key: string): Promise<Buffer | null> {
    if (!this.bucket) {
      return null;
    }

    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      const body = response.Body as Readable | undefined;
      if (!body) {
        return null;
      }

      return await this.streamToBuffer(body);
    } catch (error) {
      this.logger.error(`❌ Error descargando objeto ${key}`, error as Error);
      return null;
    }
  }

  getPublicUrl(key: string) {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`;
    }

    if (this.endpoint && this.bucket) {
      return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;
    }

    return `/uploads/evidencias/${key}`;
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return await new Promise<Buffer>((resolve, reject) => {
      stream.on('data', (chunk) =>
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
      );
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err) => reject(err));
    });
  }
}
