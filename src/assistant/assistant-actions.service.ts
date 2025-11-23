import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AssistantActionsService {
  constructor(private prisma: PrismaService) {}

  // -------------------------------------------------------
  // 📋 CREAR ORDEN DESDE CHAT
  // -------------------------------------------------------
  async crearOrden(params: {
    descripcion: string;
    ubicacion: string;
    prioridad?: string;
    tipoProblema?: string;
    clienteId: number;
  }): Promise<any> {
    try {
      const orden = await this.prisma.orden.create({
        data: {
          descripcion: params.descripcion,
          ubicacion: params.ubicacion,
          prioridad: (params.prioridad as any) || 'MEDIA',
          tipoProblema: params.tipoProblema,
          clienteid: params.clienteId,
          estado: 'PENDIENTE',
          fechasolicitud: new Date(),
        },
        include: {
          cliente: true,
        },
      });

      console.log(`✅ Orden #${orden.id} creada por asistente`);

      return {
        success: true,
        orden,
        mensaje: `✅ Orden #${orden.id} creada exitosamente. Estado: PENDIENTE`,
      };
    } catch (error) {
      console.error('❌ Error al crear orden:', error);
      return {
        success: false,
        error: error.message,
        mensaje: '❌ No pude crear la orden. Por favor, intenta de nuevo.',
      };
    }
  }

  // -------------------------------------------------------
  // ✏️ MODIFICAR ORDEN DESDE CHAT
  // -------------------------------------------------------
  async modificarOrden(params: {
    ordenId: number;
    descripcion?: string;
    ubicacion?: string;
    prioridad?: string;
    estado?: string;
  }): Promise<any> {
    try {
      const updateData: any = {};
      if (params.descripcion) updateData.descripcion = params.descripcion;
      if (params.ubicacion) updateData.ubicacion = params.ubicacion;
      if (params.prioridad) updateData.prioridad = params.prioridad;
      if (params.estado) updateData.estado = params.estado;

      const orden = (await this.prisma.orden.update({
        where: { id: params.ordenId },
        data: updateData,
        include: {
          cliente: true,
          tecnico: true,
        },
      })) as any;

      console.log(`✅ Orden #${orden.id} modificada por asistente`);

      return {
        success: true,
        orden,
        mensaje: `✅ Orden #${orden.id} actualizada exitosamente.`,
      };
    } catch (error) {
      console.error('❌ Error al modificar orden:', error);
      return {
        success: false,
        error: error.message,
        mensaje: '❌ No pude modificar la orden. Verifica que exista.',
      };
    }
  }

  // -------------------------------------------------------
  // 👤 ASIGNAR TÉCNICO DESDE CHAT
  // -------------------------------------------------------
  async asignarTecnico(params: {
    ordenId: number;
    tecnicoId?: number;
    autoAsignar?: boolean;
  }): Promise<any> {
    try {
      let tecnicoId = params.tecnicoId;

      // Auto-asignar técnico disponible
      if (params.autoAsignar || !tecnicoId) {
        const tecnicoDisponible = await this.encontrarTecnicoOptimo(
          params.ordenId,
        );
        if (!tecnicoDisponible) {
          return {
            success: false,
            mensaje: '❌ No hay técnicos disponibles en este momento.',
          };
        }
        tecnicoId = tecnicoDisponible.id;
      }

      const orden = (await this.prisma.orden.update({
        where: { id: params.ordenId },
        data: {
          tecnicoid: tecnicoId,
          estado: 'ASIGNADO',
        },
        include: {
          cliente: true,
          tecnico: true,
        },
      })) as any;

      console.log(
        `✅ Orden #${orden.id} asignada a técnico #${tecnicoId} por asistente`,
      );

      return {
        success: true,
        orden,
        mensaje: `✅ Orden #${orden.id} asignada a ${orden.tecnico.nombre}`,
      };
    } catch (error) {
      console.error('❌ Error al asignar técnico:', error);
      return {
        success: false,
        error: error.message,
        mensaje: '❌ No pude asignar el técnico.',
      };
    }
  }

  // -------------------------------------------------------
  // 🎯 ENCONTRAR TÉCNICO ÓPTIMO
  // -------------------------------------------------------
  private async encontrarTecnicoOptimo(ordenId: number): Promise<any> {
    // Obtener técnicos disponibles
    const tecnicos = (await this.prisma.tecnico.findMany({
      where: { disponibilidad: 'DISPONIBLE' },
      include: {
        orden: {
          where: {
            estado: {
              in: ['ASIGNADO', 'EN_PROCESO'],
            },
          },
        },
      },
    })) as any;

    if (tecnicos.length === 0) return null;

    // Ordenar por carga de trabajo (menos órdenes activas primero)
    tecnicos.sort((a, b) => (a.orden?.length || 0) - (b.orden?.length || 0));

    return tecnicos[0];
  }

  // -------------------------------------------------------
  // 📊 OBTENER ESTADÍSTICAS PARA ASISTENTE
  // -------------------------------------------------------
  async obtenerEstadisticas(): Promise<any> {
    const [
      totalOrdenes,
      pendientes,
      enProceso,
      completadas,
      tecnicosDisponibles,
    ] = await Promise.all([
      this.prisma.orden.count(),
      this.prisma.orden.count({ where: { estado: 'PENDIENTE' } }),
      this.prisma.orden.count({ where: { estado: 'EN_PROCESO' } }),
      this.prisma.orden.count({ where: { estado: 'COMPLETADO' } }),
      this.prisma.tecnico.count({ where: { disponibilidad: 'DISPONIBLE' } }),
    ]);

    return {
      totalOrdenes,
      pendientes,
      enProceso,
      completadas,
      tecnicosDisponibles,
    };
  }

  // -------------------------------------------------------
  // 🔍 BUSCAR ÓRDENES
  // -------------------------------------------------------
  async buscarOrdenes(params: {
    clienteId?: number;
    tecnicoId?: number;
    estado?: string;
    limit?: number;
  }): Promise<any> {
    const where: any = {};
    if (params.clienteId) where.clienteid = params.clienteId;
    if (params.tecnicoId) where.tecnicoid = params.tecnicoId;
    if (params.estado) where.estado = params.estado;

    const ordenes = await this.prisma.orden.findMany({
      where,
      include: {
        cliente: true,
        tecnico: true,
      },
      orderBy: { fechasolicitud: 'desc' },
      take: params.limit || 10,
    });

    return ordenes;
  }

  // -------------------------------------------------------
  // 🚨 DETECTAR ÓRDENES PROBLEMÁTICAS
  // -------------------------------------------------------
  async detectarOrdenesProblematicas(): Promise<any> {
    const ahora = new Date();
    const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
    const hace48h = new Date(ahora.getTime() - 48 * 60 * 60 * 1000);

    // Órdenes pendientes por más de 24h
    const pendientesMucho = await this.prisma.orden.count({
      where: {
        estado: 'PENDIENTE',
        fechasolicitud: { lt: hace24h },
      },
    });

    // Órdenes en proceso por más de 48h
    const enProcesoMucho = await this.prisma.orden.count({
      where: {
        estado: 'EN_PROCESO',
        fechasolicitud: { lt: hace48h },
      },
    });

    // Órdenes de alta prioridad pendientes
    const altaPrioridadPendientes = await this.prisma.orden.count({
      where: {
        estado: 'PENDIENTE',
        prioridad: 'ALTA',
      },
    });

    return {
      pendientesMucho,
      enProcesoMucho,
      altaPrioridadPendientes,
      hayProblemas:
        pendientesMucho > 0 ||
        enProcesoMucho > 0 ||
        altaPrioridadPendientes > 0,
    };
  }

  // -------------------------------------------------------
  // 🔄 REORGANIZAR ASIGNACIONES (ACCIÓN PROACTIVA)
  // -------------------------------------------------------
  async reorganizarAsignaciones(): Promise<any> {
    try {
      // Obtener técnicos con su carga de trabajo
      const tecnicos = (await this.prisma.tecnico.findMany({
        where: { disponibilidad: 'DISPONIBLE' },
        include: {
          orden: {
            where: {
              estado: { in: ['ASIGNADO', 'EN_PROCESO'] },
            },
          },
        },
      })) as any;

      // Obtener órdenes pendientes de alta prioridad
      const ordenesPendientes = await this.prisma.orden.findMany({
        where: {
          estado: 'PENDIENTE',
          prioridad: 'ALTA',
        },
        orderBy: { fechasolicitud: 'asc' },
      });

      const asignaciones: any[] = [];

      for (const orden of ordenesPendientes) {
        // Encontrar técnico con menos carga
        const tecnicoOptimo = tecnicos.reduce((prev, current) =>
          (prev.orden?.length || 0) < (current.orden?.length || 0)
            ? prev
            : current,
        );

        if (tecnicoOptimo) {
          await this.prisma.orden.update({
            where: { id: orden.id },
            data: {
              tecnicoid: tecnicoOptimo.id,
              estado: 'ASIGNADO',
            },
          });

          asignaciones.push({
            ordenId: orden.id,
            tecnicoId: tecnicoOptimo.id,
            tecnicoNombre: tecnicoOptimo.nombre,
          } as any);

          // Actualizar carga del técnico
          if (tecnicoOptimo.orden) tecnicoOptimo.orden.push(orden as any);
        }
      }

      console.log(
        `✅ ${asignaciones.length} órdenes reorganizadas automáticamente`,
      );

      return {
        success: true,
        asignaciones,
        mensaje: `✅ ${asignaciones.length} órdenes reorganizadas automáticamente`,
      };
    } catch (error) {
      console.error('❌ Error al reorganizar asignaciones:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
