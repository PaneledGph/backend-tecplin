import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as path from 'path';

@Injectable()
export class EvidenciasService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async uploadEvidencia(
    ordenId: number,
    file: Express.Multer.File,
    metadata: { userId?: string; userRole?: string; userName?: string },
  ) {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const key = path.posix.join(
      'evidencias',
      `orden-${ordenId}-${timestamp}${extension}`,
    );

    const uploadResult = await this.storage.uploadFile(
      key,
      file.buffer,
      file.mimetype,
    );

    const evidencia = await this.prisma.evidencia.create({
      data: {
        ordenid: ordenId,
        filename: key,
        filepath: uploadResult.url,
        mimetype: file.mimetype,
        size: file.size,
        userid: metadata.userId,
        userrole: metadata.userRole,
        username: metadata.userName,
      },
    });

    return this.withPublicUrl(evidencia);
  }

  async findByOrden(ordenId: number) {
    const evidencias = await this.prisma.evidencia.findMany({
      where: {
        ordenid: ordenId,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return evidencias.map((evidencia) => this.withPublicUrl(evidencia));
  }

  async findOne(id: number) {
    const evidencia = await this.prisma.evidencia.findUnique({
      where: { id },
    });

    return evidencia ? this.withPublicUrl(evidencia) : null;
  }

  async remove(id: number) {
    const evidencia = await this.prisma.evidencia.findUnique({
      where: { id },
    });

    if (evidencia?.filename) {
      await this.storage.deleteFile(evidencia.filename);
    }

    return this.prisma.evidencia.delete({
      where: { id },
    });
  }

  private withPublicUrl<
    T extends { filename: string; filepath: string | null },
  >(evidencia: T) {
    const url = evidencia.filepath?.startsWith('http')
      ? evidencia.filepath
      : this.storage.getPublicUrl(evidencia.filename);

    return {
      ...evidencia,
      url,
    };
  }
}
