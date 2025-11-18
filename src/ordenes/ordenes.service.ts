import { Injectable, Inject, forwardRef, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificacionesService } from 'src/notificaciones/notificaciones.service';
import { NotificacionesGateway } from 'src/notificaciones/notificaciones.gateway';
import { ChatService } from 'src/chat/chat.service';
import { Estado, Prioridad } from '@prisma/client';

console.log('Estados disponibles:', Object.values(Estado));
console.log('Prioridades disponibles:', Object.values(Prioridad));

@Injectable()
export class OrdenesService {
  constructor(
    private prisma: PrismaService,
    private notificacionesService: NotificacionesService,
    private notificacionesGateway: NotificacionesGateway,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
  ) {}

  // Crear nueva orden
  async crearOrden(
    clienteid: number,
    descripcion: string,
    prioridad: Prioridad = 'MEDIA',
    ubicacion?: string,
    tipoProblema?: string,
    ubicacionLatitud?: number,
    ubicacionLongitud?: number,
    nombreContacto?: string,
    telefonoContacto?: string,
    emailContacto?: string,
    horarioPreferido?: string,
    materialesRequeridos?: string,
    observaciones?: string,
    imagenes?: string[],
    costoEstimado?: number,
    tiempoEstimadoHoras?: number,
  ) {
    return this.prisma.orden.create({
      data: {
        descripcion,
        clienteid,
        prioridad,
        ubicacion,
        tipoProblema,
        ubicacionLatitud,
        ubicacionLongitud,
        nombreContacto,
        telefonoContacto,
        emailContacto,
        horarioPreferido,
        materialesRequeridos,
        observaciones,
        imagenes: imagenes || [],
        costoEstimado,
        tiempoEstimadoHoras,
      },
    });
  }

  // Obtener todas las órdenes del cliente
  async obtenerOrdenesCliente(clienteid: number) {
    return this.prisma.orden.findMany({
      where: { clienteid }, // ✅ corregido
      include: { tecnico: true, cliente: true },
      orderBy: { fechasolicitud: 'desc' }, // ✅ corregido
    });
  }

  // Obtener todas las órdenes (ADMIN o TECNICO) con paginación
  async obtenerTodasOrdenes(page: number = 1, limit: number = 50, estado?: Estado) {
    const skip = (page - 1) * limit;
    
    const where = estado ? { estado } : {};
    
    const [ordenes, total] = await Promise.all([
      this.prisma.orden.findMany({
        where,
        include: { cliente: true, tecnico: true },
        orderBy: { fechasolicitud: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.orden.count({ where }),
    ]);

    return {
      data: ordenes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Actualizar estado
  async actualizarEstado(ordenId: number, estado: Estado) {
    return this.prisma.orden.update({
      where: { id: ordenId },
      data: { estado },
    });
  }

  // Asignar técnico
  async asignarTecnico(ordenId: number, tecnicoid: number) {
    // Validar que el técnico existe
    if (!tecnicoid) {
      throw new Error('Debe proporcionar un ID de técnico válido');
    }

    const tecnico = await this.prisma.tecnico.findUnique({
      where: { id: tecnicoid },
      include: { usuario: true },
    });

    if (!tecnico) {
      throw new Error(`No se encontró el técnico con ID ${tecnicoid}`);
    }

    // Obtener la orden con el cliente
    const orden = await this.prisma.orden.findUnique({
      where: { id: ordenId },
      include: { cliente: { include: { usuario: true } } },
    });

    if (!orden) {
      throw new Error(`No se encontró la orden con ID ${ordenId}`);
    }

    // Actualizar la orden
    const ordenActualizada = await this.prisma.orden.update({
      where: { id: ordenId },
      data: { tecnicoid, estado: 'ASIGNADO' },
      include: { cliente: true, tecnico: true },
    });

    // 💬 Crear conversación automática entre cliente y técnico
    try {
      const clienteUserId = orden.cliente.usuario.id;
      const tecnicoUserId = tecnico.usuario.id;

      await this.chatService.createConversationForOrder(
        clienteUserId,
        tecnicoUserId,
        ordenId,
      );

      console.log(`💬 Chat creado automáticamente para orden #${ordenId}`);
    } catch (error) {
      console.error('Error al crear conversación:', error);
      // No fallar la asignación si falla la creación del chat
    }

    // 📬 Enviar notificación al técnico
    try {
      await this.notificacionesService.notificarTecnico(tecnicoid, ordenId);
      
      // Broadcast en tiempo real
      this.notificacionesGateway.broadcastOrdenActualizada(ordenId, {
        estado: 'ASIGNADO',
        tecnicoId: tecnicoid,
      });
    } catch (error) {
      console.error('Error al enviar notificación:', error);
      // No fallar la asignación si falla la notificación
    }

    return ordenActualizada;
  }

  // Completar orden (actualiza estado y fecha)
  async completarOrden(ordenId: number) {
    // 💬 Cerrar conversación asociada a la orden
    try {
      await this.chatService.closeConversationByOrder(ordenId);
      console.log(`💬 Chat cerrado automáticamente para orden #${ordenId}`);
    } catch (error) {
      console.error('Error al cerrar conversación:', error);
      // No fallar la completación si falla el cierre del chat
    }

    return this.prisma.orden.update({
      where: { id: ordenId },
      data: {
        estado: 'COMPLETADO',
        fechaCompletado: new Date(),
      },
      include: { cliente: true, tecnico: true },
    });
  }

  // Calificar servicio
  async calificarServicio(ordenId: number, calificacion: number, comentario?: string) {
    // Validar calificación (1-5)
    if (calificacion < 1 || calificacion > 5) {
      throw new Error('La calificación debe estar entre 1 y 5');
    }

    // Verificar que la orden esté completada
    const orden = await this.prisma.orden.findUnique({
      where: { id: ordenId },
    });

    if (!orden) {
      throw new Error('Orden no encontrada');
    }

    if (orden.estado !== 'COMPLETADO') {
      throw new Error('Solo se pueden calificar órdenes completadas');
    }

    return this.prisma.orden.update({
      where: { id: ordenId },
      data: {
        calificacion: calificacion,
        comentarioCalificacion: comentario,
      },
      include: { cliente: true, tecnico: true },
    });
  }

  // Obtener orden por ID
  async obtenerOrdenPorId(ordenId: number) {
    return this.prisma.orden.findUnique({
      where: { id: ordenId },
      include: { 
        cliente: true, 
        tecnico: true,
        evidencias: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });
  }

  // Actualizar orden
  async actualizarOrden(ordenId: number, data: any) {
    return this.prisma.orden.update({
      where: { id: ordenId },
      data: {
        ...data,
        // Si se proporcionan imágenes, agregarlas al array existente
        ...(data.imagenes && {
          imagenes: {
            push: data.imagenes,
          },
        }),
      },
      include: { cliente: true, tecnico: true },
    });
  }

  async registrarUbicacionTecnico(
    ordenId: number,
    tecnicoId: number,
    lat: number,
    lng: number,
    precision?: number,
  ) {
    const orden = await this.prisma.orden.findUnique({
      where: { id: ordenId },
      select: { tecnicoid: true, estado: true },
    });

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (orden.tecnicoid !== tecnicoId) {
      throw new ForbiddenException('Este técnico no está asignado a la orden.');
    }

    await this.prisma.tecnicoUbicacion.upsert({
      where: { tecnicoId },
      update: { lat, lng, precision, ordenId: ordenId },
      create: { tecnicoId, lat, lng, precision, ordenId: ordenId },
    });

    await this.prisma.tecnicoUbicacionLog.create({
      data: {
        tecnicoId,
        ordenId,
        lat,
        lng,
        precision,
      },
    });

    return { ok: true };
  }

  async obtenerRutaTecnico(ordenId: number) {
    const orden = await this.prisma.orden.findUnique({
      where: { id: ordenId },
      select: { id: true, tecnicoid: true },
    });

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    const puntos = await this.prisma.tecnicoUbicacionLog.findMany({
      where: { ordenId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      ordenId,
      tecnicoId: orden.tecnicoid,
      totalPuntos: puntos.length,
      puntos,
    };
  }
}
