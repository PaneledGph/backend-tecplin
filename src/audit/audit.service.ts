import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  // -------------------------------------------------------
  // 📝 REGISTRAR ACCIÓN
  // -------------------------------------------------------
  async registrarAccion(
    usuarioId: number,
    accion: string,
    entidad?: string,
    entidadId?: number,
    detalles?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          usuarioId,
          accion,
          entidad,
          entidadId,
          detalles: detalles || undefined,
          ipAddress: undefined,
          userAgent: undefined,
        },
      });

      console.log(`📝 Audit: ${accion} por usuario ${usuarioId}`);
    } catch (error) {
      console.error('❌ Error al registrar audit log:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  // -------------------------------------------------------
  // 📊 OBTENER LOGS (con filtros)
  // -------------------------------------------------------
  async obtenerLogs(filtros?: {
    usuarioId?: number;
    accion?: string;
    entidad?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filtros?.usuarioId) where.usuarioId = filtros.usuarioId;
    if (filtros?.accion) where.accion = { contains: filtros.accion };
    if (filtros?.entidad) where.entidad = filtros.entidad;
    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.createdAt = {};
      if (filtros.fechaDesde) where.createdAt.gte = filtros.fechaDesde;
      if (filtros.fechaHasta) where.createdAt.lte = filtros.fechaHasta;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          usuario: {
            select: {
              id: true,
              usuario: true,
              rol: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filtros?.limit || 50,
        skip: filtros?.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit: filtros?.limit || 50,
      offset: filtros?.offset || 0,
    };
  }

  // -------------------------------------------------------
  // 📈 ESTADÍSTICAS DE AUDITORÍA
  // -------------------------------------------------------
  async obtenerEstadisticas(fechaDesde?: Date, fechaHasta?: Date) {
    const where: any = {};
    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) where.createdAt.gte = fechaDesde;
      if (fechaHasta) where.createdAt.lte = fechaHasta;
    }

    const [
      totalAcciones,
      accionesPorTipo,
      accionesPorUsuario,
      accionesPorEntidad,
    ] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['accion'],
        where,
        _count: true,
        orderBy: { _count: { accion: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['usuarioId'],
        where,
        _count: true,
        orderBy: { _count: { usuarioId: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['entidad'],
        where,
        _count: true,
        orderBy: { _count: { entidad: 'desc' } },
      }),
    ]);

    return {
      totalAcciones,
      accionesPorTipo,
      accionesPorUsuario,
      accionesPorEntidad,
    };
  }

  // -------------------------------------------------------
  // 🗑️ LIMPIAR LOGS ANTIGUOS
  // -------------------------------------------------------
  async limpiarLogsAntiguos(diasAntiguedad: number = 90) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: fechaLimite,
        },
      },
    });

    console.log(`🗑️ Eliminados ${result.count} audit logs antiguos`);
    return result.count;
  }

  // -------------------------------------------------------
  // 🔍 BUSCAR POR ENTIDAD
  // -------------------------------------------------------
  async obtenerLogsPorEntidad(entidad: string, entidadId: number) {
    return this.prisma.auditLog.findMany({
      where: {
        entidad,
        entidadId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            usuario: true,
            rol: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
