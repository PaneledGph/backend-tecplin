import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class UploadService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async guardarEvidencia(
    ordenId: number,
    file: Express.Multer.File,
    metadata: {
      userId: string;
      userRole: string;
      userName: string;
    },
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
        timestamp: new Date(),
      },
    });

    return evidencia;
  }

  async obtenerEvidencias(ordenId: number) {
    const evidencias = await this.prisma.evidencia.findMany({
      where: { ordenid: ordenId },
      orderBy: { timestamp: 'asc' },
    });

    return evidencias.map((evidencia) => this.withPublicUrl(evidencia));
  }

  async eliminarEvidencia(id: number) {
    const evidencia = await this.prisma.evidencia.findUnique({
      where: { id },
    });

    if (evidencia) {
      if (evidencia.filename) {
        await this.storage.deleteFile(evidencia.filename);
      } else if (evidencia.filepath && fs.existsSync(evidencia.filepath)) {
        fs.unlinkSync(evidencia.filepath);
      }

      // Eliminar registro de BD
      await this.prisma.evidencia.delete({
        where: { id },
      });
    }

    return { success: true };
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
