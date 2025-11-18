import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TipoNotificacion } from '@prisma/client';

@Injectable()
export class NotificacionesService {
  constructor(private prisma: PrismaService) {}

  async crear(data: {
    usuarioId: number;
    tipo: TipoNotificacion;
    titulo: string;
    mensaje: string;
    ordenId?: number;
  }) {
    return this.prisma.notificacion.create({
      data,
    });
  }

  async notificarTecnico(tecnicoId: number, ordenId: number) {
    const tecnico = await this.prisma.tecnico.findUnique({
      where: { id: tecnicoId },
      include: { usuario: true },
    });

    const orden = await this.prisma.orden.findUnique({
      where: { id: ordenId },
      include: { cliente: true },
    });

    if (!tecnico || !orden) return null;

    return this.crear({
      usuarioId: tecnico.usuarioid,
      tipo: 'ORDEN_ASIGNADA',
      titulo: '🔧 Nueva orden asignada',
      mensaje: `Se te ha asignado la orden #${ordenId}: ${orden.descripcion}`,
      ordenId,
    });
  }

  async notificarCliente(clienteId: number, ordenId: number, mensaje: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      include: { usuario: true },
    });

    if (!cliente) return null;

    return this.crear({
      usuarioId: cliente.usuarioId,
      tipo: 'ORDEN_ACTUALIZADA',
      titulo: '📋 Actualización de orden',
      mensaje,
      ordenId,
    });
  }

  async obtenerNotificaciones(usuarioId: number, limit = 20) {
    return this.prisma.notificacion.findMany({
      where: { usuarioId },
      include: { orden: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async marcarLeida(notificacionId: number) {
    return this.prisma.notificacion.update({
      where: { id: notificacionId },
      data: { leida: true },
    });
  }

  async marcarTodasLeidas(usuarioId: number) {
    return this.prisma.notificacion.updateMany({
      where: { usuarioId, leida: false },
      data: { leida: true },
    });
  }

  async contarNoLeidas(usuarioId: number) {
    return this.prisma.notificacion.count({
      where: { usuarioId, leida: false },
    });
  }
}
