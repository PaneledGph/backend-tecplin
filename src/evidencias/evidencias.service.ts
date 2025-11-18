import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EvidenciasService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    ordenid: number;
    filename: string;
    filepath: string;
    mimetype?: string;
    size?: number;
    userid?: string;
    userrole?: string;
    username?: string;
  }) {
    return this.prisma.evidencia.create({
      data: {
        ordenid: data.ordenid,
        filename: data.filename,
        filepath: data.filepath,
        mimetype: data.mimetype,
        size: data.size,
        userid: data.userid,
        userrole: data.userrole,
        username: data.username,
      },
    });
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

    // Agregar URL completa para acceder a las imágenes
    return evidencias.map(evidencia => ({
      ...evidencia,
      url: `http://10.0.2.2:3000/uploads/evidencias/${evidencia.filename}`,
      filepath: evidencia.filepath, // Mantener el path original
    }));
  }

  async findOne(id: number) {
    return this.prisma.evidencia.findUnique({
      where: { id },
    });
  }

  async remove(id: number) {
    return this.prisma.evidencia.delete({
      where: { id },
    });
  }
}
