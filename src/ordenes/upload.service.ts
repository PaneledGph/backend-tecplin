import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  // Directorio para guardar las fotos
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'evidencias');

  constructor(private prisma: PrismaService) {
    // Crear directorio si no existe
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async guardarEvidencia(
    ordenId: number,
    file: Express.Multer.File,
    metadata: {
      userId: string;
      userRole: string;
      userName: string;
    },
  ) {
    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `orden-${ordenId}-${timestamp}${extension}`;
    const filepath = path.join(this.uploadDir, filename);

    // Guardar archivo físicamente
    fs.writeFileSync(filepath, file.buffer);

    // Guardar metadata en la base de datos
    const evidencia = await this.prisma.evidencia.create({
      data: {
        ordenid: ordenId,
        filename: filename,
        filepath: filepath,
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
    return this.prisma.evidencia.findMany({
      where: { ordenid: ordenId },
      orderBy: { timestamp: 'asc' },
    });
  }

  async eliminarEvidencia(id: number) {
    const evidencia = await this.prisma.evidencia.findUnique({
      where: { id },
    });

    if (evidencia) {
      // Eliminar archivo físico
      if (fs.existsSync(evidencia.filepath)) {
        fs.unlinkSync(evidencia.filepath);
      }

      // Eliminar registro de BD
      await this.prisma.evidencia.delete({
        where: { id },
      });
    }

    return { success: true };
  }

  getFilePath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }
}
