import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificacionesService } from 'src/notificaciones/notificaciones.service';
import { NotificacionesGateway } from 'src/notificaciones/notificaciones.gateway';
import { OrdenData } from './assistant.types';

@Injectable()
export class AssistantHandlersService {
  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionesService,
    private notificacionesGateway: NotificacionesGateway,
  ) {}

  // -------------------------------------------------------
  // 🆕 CREAR ORDEN
  // -------------------------------------------------------
  async handleCrearOrden(userId: number, data: OrdenData, userRole?: string) {
    const { descripcion, prioridad, ubicacion, tipoProblema, especialidadRequerida } = data;

    let clienteId: number;

    if (userRole === 'ADMIN') {
      // Admin puede crear órdenes, usar el primer cliente disponible o crear para un cliente específico
      const primerCliente = await this.prisma.cliente.findFirst();
      
      if (!primerCliente) {
        return {
          intent: 'CREAR_ORDEN',
          respuesta: 'No hay clientes registrados en el sistema.',
          autoFeedback: -1,
        };
      }
      
      clienteId = primerCliente.id;
    } else {
      // Cliente crea su propia orden
      const cliente = await this.prisma.cliente.findUnique({
        where: { usuarioId: userId },
      });

      if (!cliente) {
        return {
          intent: 'CREAR_ORDEN',
          respuesta: 'No encontré tu perfil de cliente.',
          autoFeedback: -1,
        };
      }

      clienteId = cliente.id;
    }

    const orden = await this.prisma.orden.create({
      data: {
        descripcion: descripcion || 'Orden sin descripción',
        prioridad: prioridad || 'MEDIA',
        clienteid: clienteId,
        ubicacion,
        tipoProblema,
        especialidadRequerida,
      },
    });

    await this.prisma.assistantMemory.upsert({
      where: { userId_key: { userId, key: 'ultima_orden' } },
      update: { value: descripcion || '', updatedAt: new Date() },
      create: { userId, key: 'ultima_orden', value: descripcion || '' },
    });

    return {
      intent: 'CREAR_ORDEN',
      respuesta: `He creado la orden #${orden.id}: "${descripcion}" con prioridad ${prioridad}. ${ubicacion ? `Ubicación: ${ubicacion}.` : ''}`,
      autoFeedback: 1,
      ordenId: orden.id,
    };
  }

  // -------------------------------------------------------
  // ✏️ MODIFICAR ORDEN
  // -------------------------------------------------------
  async handleModificarOrden(userId: number, data: OrdenData, userRole: string) {
    const { ordenId, descripcion, prioridad, ubicacion } = data;

    if (!ordenId) {
      return {
        intent: 'MODIFICAR_ORDEN',
        respuesta: 'Por favor especifica el número de orden que deseas modificar.',
        autoFeedback: -1,
      };
    }

    const orden = await this.prisma.orden.findUnique({
      where: { id: ordenId },
      include: { cliente: true },
    });

    if (!orden) {
      return {
        intent: 'MODIFICAR_ORDEN',
        respuesta: `No encontré la orden #${ordenId}.`,
        autoFeedback: -1,
      };
    }

    // Validar permisos
    if (userRole !== 'ADMIN' && orden.cliente.usuarioId !== userId) {
      return {
        intent: 'MODIFICAR_ORDEN',
        respuesta: 'No tienes permiso para modificar esta orden.',
        autoFeedback: -1,
      };
    }

    await this.prisma.orden.update({
      where: { id: ordenId },
      data: {
        ...(descripcion && { descripcion }),
        ...(prioridad && { prioridad }),
        ...(ubicacion && { ubicacion }),
      },
    });

    // Notificar cambios
    if (orden.tecnicoid) {
      await this.notificaciones.crear({
        usuarioId: orden.tecnicoid,
        tipo: 'ORDEN_ACTUALIZADA',
        titulo: '📝 Orden modificada',
        mensaje: `La orden #${ordenId} ha sido actualizada.`,
        ordenId,
      });
    }

    this.notificacionesGateway.broadcastOrdenActualizada(ordenId, { estado: orden.estado });

    return {
      intent: 'MODIFICAR_ORDEN',
      respuesta: `He actualizado la orden #${ordenId}. ${descripcion ? `Nueva descripción: "${descripcion}". ` : ''}${prioridad ? `Prioridad: ${prioridad}.` : ''}`,
      autoFeedback: 1,
    };
  }

  // -------------------------------------------------------
  // ❌ CANCELAR ORDEN
  // -------------------------------------------------------
  async handleCancelarOrden(userId: number, data: OrdenData, userRole: string) {
    const { ordenId } = data;

    if (!ordenId) {
      return {
        intent: 'CANCELAR_ORDEN',
        respuesta: 'Por favor especifica el número de orden que deseas cancelar.',
        autoFeedback: -1,
      };
    }

    const orden = await this.prisma.orden.findUnique({
      where: { id: ordenId },
      include: { cliente: true, tecnico: true },
    });

    if (!orden) {
      return {
        intent: 'CANCELAR_ORDEN',
        respuesta: `No encontré la orden #${ordenId}.`,
        autoFeedback: -1,
      };
    }

    if (userRole !== 'ADMIN' && orden.cliente.usuarioId !== userId) {
      return {
        intent: 'CANCELAR_ORDEN',
        respuesta: 'No tienes permiso para cancelar esta orden.',
        autoFeedback: -1,
      };
    }

    await this.prisma.orden.update({
      where: { id: ordenId },
      data: { estado: 'CANCELADO' },
    });

    // Notificar al técnico si estaba asignado
    if (orden.tecnico) {
      await this.notificaciones.crear({
        usuarioId: orden.tecnico.usuarioid,
        tipo: 'ORDEN_CANCELADA',
        titulo: '🚫 Orden cancelada',
        mensaje: `La orden #${ordenId} ha sido cancelada.`,
        ordenId,
      });
    }

    return {
      intent: 'CANCELAR_ORDEN',
      respuesta: `He cancelado la orden #${ordenId}.`,
      autoFeedback: 1,
    };
  }

  // -------------------------------------------------------
  // 🔧 ASIGNAR TÉCNICO
  // -------------------------------------------------------
  async handleAsignarTecnico(userId: number, data: OrdenData, userRole: string) {
    if (userRole !== 'ADMIN') {
      return {
        intent: 'ASIGNAR_TECNICO',
        respuesta: 'Solo los administradores pueden asignar técnicos.',
        autoFeedback: -1,
      };
    }

    const { ordenId, tecnicoId, especialidadRequerida } = data;

    if (!ordenId) {
      return {
        intent: 'ASIGNAR_TECNICO',
        respuesta: 'Por favor especifica el número de orden.',
        autoFeedback: -1,
      };
    }

    let tecnico;

    if (tecnicoId) {
      tecnico = await this.prisma.tecnico.findUnique({ where: { id: tecnicoId } });
    } else {
      // 🧠 Buscar técnico más adecuado
      tecnico = await this.findBestTechnician(especialidadRequerida);
    }

    if (!tecnico) {
      return {
        intent: 'ASIGNAR_TECNICO',
        respuesta: 'No encontré técnicos disponibles con esa especialidad.',
        autoFeedback: -1,
      };
    }

    await this.prisma.orden.update({
      where: { id: ordenId },
      data: {
        tecnicoid: tecnico.id,
        estado: 'ASIGNADO',
      },
    });

    // Notificar al técnico
    await this.notificaciones.notificarTecnico(tecnico.id, ordenId);

    return {
      intent: 'ASIGNAR_TECNICO',
      respuesta: `He asignado la orden #${ordenId} al técnico ${tecnico.nombre}. Le he enviado una notificación.`,
      autoFeedback: 1,
    };
  }

  // -------------------------------------------------------
  // 🔍 CONSULTAR ESTADO
  // -------------------------------------------------------
  async handleConsultarEstado(userId: number, data: OrdenData) {
    const { ordenId } = data;

    if (!ordenId) {
      // Mostrar última orden
      const ultimaOrden = await this.prisma.orden.findFirst({
        where: { cliente: { usuarioId: userId } },
        orderBy: { fechasolicitud: 'desc' },
        include: { tecnico: true },
      });

      if (!ultimaOrden) {
        return {
          intent: 'CONSULTAR_ESTADO',
          respuesta: 'No tienes órdenes registradas.',
          autoFeedback: 0,
        };
      }

      return {
        intent: 'CONSULTAR_ESTADO',
        respuesta: `Tu última orden #${ultimaOrden.id} está en estado: ${ultimaOrden.estado}. ${ultimaOrden.tecnico ? `Técnico asignado: ${ultimaOrden.tecnico.nombre}.` : 'Sin técnico asignado aún.'}`,
        autoFeedback: 1,
      };
    }

    const orden = await this.prisma.orden.findUnique({
      where: { id: ordenId },
      include: { tecnico: true, cliente: true },
    });

    if (!orden) {
      return {
        intent: 'CONSULTAR_ESTADO',
        respuesta: `No encontré la orden #${ordenId}.`,
        autoFeedback: -1,
      };
    }

    return {
      intent: 'CONSULTAR_ESTADO',
      respuesta: `La orden #${ordenId} está en estado: ${orden.estado}. ${orden.tecnico ? `Técnico: ${orden.tecnico.nombre}.` : 'Sin técnico asignado.'}`,
      autoFeedback: 1,
    };
  }

  // -------------------------------------------------------
  // 📋 VER ÓRDENES
  // -------------------------------------------------------
  async handleVerOrdenes(userId: number, userRole?: string) {
    let ordenes;

    if (userRole === 'ADMIN') {
      // Admin ve todas las órdenes
      ordenes = await this.prisma.orden.findMany({
        orderBy: { fechasolicitud: 'desc' },
        take: 10,
        include: { tecnico: true, cliente: true },
      });
    } else if (userRole === 'TECNICO') {
      // Técnico ve sus órdenes asignadas
      const tecnico = await this.prisma.tecnico.findUnique({
        where: { usuarioid: userId },
      });
      
      if (!tecnico) {
        return {
          intent: 'VER_ORDENES',
          respuesta: 'No encontré tu perfil de técnico.',
          autoFeedback: -1,
        };
      }

      ordenes = await this.prisma.orden.findMany({
        where: { tecnicoid: tecnico.id },
        orderBy: { fechasolicitud: 'desc' },
        take: 10,
        include: { cliente: true },
      });
    } else {
      // Cliente ve sus propias órdenes
      ordenes = await this.prisma.orden.findMany({
        where: { cliente: { usuarioId: userId } },
        orderBy: { fechasolicitud: 'desc' },
        take: 5,
        include: { tecnico: true },
      });
    }

    if (ordenes.length === 0) {
      return {
        intent: 'VER_ORDENES',
        respuesta: 'No tienes órdenes registradas.',
        autoFeedback: 0,
      };
    }

    const lista = ordenes
      .map(
        (o) =>
          `#${o.id}: ${o.descripcion} - Estado: ${o.estado} - Prioridad: ${o.prioridad}`,
      )
      .join('\n');

    return {
      intent: 'VER_ORDENES',
      respuesta: `Tienes ${ordenes.length} órdenes:\n${lista}`,
      autoFeedback: 1,
    };
  }

  // -------------------------------------------------------
  // 🧠 ALGORITMO DE SELECCIÓN INTELIGENTE
  // -------------------------------------------------------
  private async findBestTechnician(especialidad?: string) {
    const tecnicos = await this.prisma.tecnico.findMany({
      where: {
        disponibilidad: 'DISPONIBLE',
        ...(especialidad && {
          especialidad: { contains: especialidad, mode: 'insensitive' },
        }),
      },
      include: {
        orden: {
          where: {
            estado: { in: ['ASIGNADO', 'EN_PROCESO'] },
          },
        },
      },
    });

    if (tecnicos.length === 0) return null;

    // Ordenar por carga de trabajo (menos órdenes activas = mejor)
    tecnicos.sort((a, b) => a.orden.length - b.orden.length);

    return tecnicos[0];
  }

  // -------------------------------------------------------
  // 🔧 OBTENER ROL DEL USUARIO
  // -------------------------------------------------------
  async getUserRole(userId: number): Promise<string> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true },
    });
    return usuario?.rol || 'CLIENTE';
  }
}
