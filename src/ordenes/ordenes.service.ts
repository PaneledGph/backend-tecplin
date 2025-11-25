import {
  Injectable,
  Inject,
  forwardRef,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificacionesService } from 'src/notificaciones/notificaciones.service';
import { NotificacionesGateway } from 'src/notificaciones/notificaciones.gateway';
import { ChatService } from 'src/chat/chat.service';
import { Estado, Prioridad } from '@prisma/client';
import { TechnicianAssignmentService } from '../assistant/technician-assignment.service';
import { PdfService } from './pdf.service';

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
    private technicianAssignment: TechnicianAssignmentService,
    private pdfService: PdfService,
  ) {}

  // Helper para construir la URL pública del PDF de una orden (si está configurado STORAGE_PUBLIC_URL)
  private buildReportePdfUrl(ordenId: number): string | null {
    const publicBaseUrl = process.env.STORAGE_PUBLIC_URL;
    if (!publicBaseUrl) {
      return null;
    }

    const base = publicBaseUrl.replace(/\/$/, '');
    const key = `reportes/orden-${ordenId}.pdf`;
    return `${base}/${key}`;
  }

  // Adjuntar reportePdfUrl dinámico a una orden completada
  private attachReportePdfUrlIfAvailable(orden: any) {
    if (!orden || orden.estado !== 'COMPLETADO') {
      return orden;
    }

    const url = this.buildReportePdfUrl(orden.id);
    if (!url) {
      return orden;
    }

    return {
      ...orden,
      reportePdfUrl: url,
    };
  }

  private calcularPrecioEstimado(
    tipoProblema?: string,
    prioridad?: Prioridad,
    tiempoEstimadoHoras?: number,
  ) {
    const tipoKey = (tipoProblema || 'DEFAULT').toUpperCase();

    const configByTipo: {
      [key: string]: {
        baseMin: number;
        baseMax: number;
        hourMin: number;
        hourMax: number;
        defaultHoras: number;
      };
    } = {
      ELECTRICO: {
        baseMin: 80,
        baseMax: 100,
        hourMin: 50,
        hourMax: 65,
        defaultHoras: 1.5,
      },
      PLOMERIA: {
        baseMin: 70,
        baseMax: 90,
        hourMin: 45,
        hourMax: 60,
        defaultHoras: 2,
      },
      AIRE_ACONDICIONADO: {
        baseMin: 100,
        baseMax: 130,
        hourMin: 60,
        hourMax: 80,
        defaultHoras: 2.5,
      },
      DEFAULT: {
        baseMin: 70,
        baseMax: 90,
        hourMin: 45,
        hourMax: 60,
        defaultHoras: 2,
      },
    };

    const config = configByTipo[tipoKey] || configByTipo.DEFAULT;

    const horas =
      tiempoEstimadoHoras && tiempoEstimadoHoras > 0
        ? tiempoEstimadoHoras
        : config.defaultHoras;

    const recargoPrioridad: {
      [key: string]: {
        min: number;
        max: number;
      };
    } = {
      BAJA: { min: 0, max: 0 },
      MEDIA: { min: 20, max: 30 },
      ALTA: { min: 40, max: 60 },
    };

    const recargo = recargoPrioridad[prioridad || 'MEDIA'] || recargoPrioridad.MEDIA;

    const baseMin = config.baseMin + config.hourMin * horas;
    const baseMax = config.baseMax + config.hourMax * horas;

    const precioMin = baseMin + recargo.min;
    const precioMax = baseMax + recargo.max;

    const promedio = (precioMin + precioMax) / 2;

    return Math.round(promedio);
  }

  // Estimar precio públicamente para el controlador /ordenes/estimar-precio
  estimarPrecio(
    tipoProblema?: string,
    prioridad?: Prioridad,
    tiempoEstimadoHoras?: number,
  ) {
    const precioEstimado = this.calcularPrecioEstimado(
      tipoProblema,
      prioridad,
      tiempoEstimadoHoras,
    );

    return { precioEstimado };
  }

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
    const costoEstimadoCalculado =
      costoEstimado != null
        ? costoEstimado
        : this.calcularPrecioEstimado(
            tipoProblema,
            prioridad,
            tiempoEstimadoHoras,
          );

    const orden = await this.prisma.orden.create({
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
        costoEstimado: costoEstimadoCalculado,
        tiempoEstimadoHoras,
      },
    });

    // Notificaciones automáticas al crear la orden
    try {
      // Notificar al cliente (si tiene usuario asociado)
      const cliente = await this.prisma.cliente.findUnique({
        where: { id: clienteid },
      });

      if (cliente?.usuarioId) {
        await this.notificacionesService.crear({
          usuarioId: cliente.usuarioId,
          tipo: 'ORDEN_ACTUALIZADA',
          titulo: '📋 Orden registrada',
          mensaje: `Tu orden #${orden.id} ha sido registrada y está en estado PENDIENTE.`,
          ordenId: orden.id,
        });
      }

      // Notificar a administradores sobre la nueva orden
      const admins = await this.prisma.usuario.findMany({
        where: { rol: 'ADMIN' },
      });

      for (const admin of admins) {
        await this.notificacionesService.crear({
          usuarioId: admin.id,
          tipo: 'ORDEN_ACTUALIZADA',
          titulo: '📋 Nueva orden creada',
          mensaje: `Se ha registrado la orden #${orden.id} del cliente ${
            (cliente as any)?.nombre || 'N/A'
          }.`,
          ordenId: orden.id,
        });
      }
    } catch (error) {
      console.error(
        'Error enviando notificaciones al crear orden:',
        error,
      );
    }

    try {
      const assignment = await this.technicianAssignment.autoAssignTechnician(
        orden.id,
      );
      if (assignment?.success && assignment.order) {
        return assignment.order;
      }
    } catch (error) {
      console.error(
        'Error en autoasignación de técnico al crear orden:',
        error,
      );
    }

    return orden;
  }

  // Obtener todas las órdenes del cliente
  async obtenerOrdenesCliente(clienteid: number) {
    const ordenes = await this.prisma.orden.findMany({
      where: { clienteid },
      include: { tecnico: true, cliente: true },
      orderBy: { fechasolicitud: 'desc' },
    });

    return ordenes.map((orden) => this.attachReportePdfUrlIfAvailable(orden));
  }

  // Obtener todas las órdenes (ADMIN o TECNICO) con paginación
  async obtenerTodasOrdenes(
    page: number = 1,
    limit: number = 50,
    estado?: Estado,
  ) {
    const skip = (page - 1) * limit;

    const where = estado ? { estado } : {};

    const [ordenesRaw, total] = await Promise.all([
      this.prisma.orden.findMany({
        where,
        include: { cliente: true, tecnico: true },
        orderBy: { fechasolicitud: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.orden.count({ where }),
    ]);

    const ordenes = ordenesRaw.map((orden) =>
      this.attachReportePdfUrlIfAvailable(orden),
    );

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

    const ordenActualizada = await this.prisma.orden.update({
      where: { id: ordenId },
      data: {
        estado: 'COMPLETADO',
        fechaCompletado: new Date(),
      },
      include: {
        cliente: { include: { usuario: true } },
        tecnico: true,
        evidencias: true,
      },
    });

    let reportePdfUrl: string | undefined;

    try {
      console.log(
        '📄 [OrdenesService] Iniciando generación de reporte PDF para orden',
        ordenId,
      );

      const uploadResult =
        await this.pdfService.generarYSubirReporteOrden(ordenActualizada);

      console.log(
        '📄 [OrdenesService] Resultado de generarYSubirReporteOrden:',
        uploadResult,
      );

      if (uploadResult && uploadResult.url) {
        reportePdfUrl = uploadResult.url;
        console.log(
          '📄 [OrdenesService] Reporte PDF generado y subido correctamente para orden',
          ordenId,
          'URL:',
          reportePdfUrl,
        );
      } else {
        console.warn(
          '⚠️ [OrdenesService] UploadResult sin URL para orden',
          ordenId,
          uploadResult,
        );
      }
    } catch (error) {
      console.error(
        'Error generando o subiendo reporte PDF automático:',
        error,
      );
    }

    try {
      const evidenciasCount = ordenActualizada.evidencias?.length || 0;

      if (ordenActualizada.cliente?.id) {
        const mensajeBase = `Tu orden #${ordenId} ha sido completada.`;
        const mensajeEvidencias =
          evidenciasCount === 0
            ? ' Aún no se han registrado evidencias fotográficas del servicio.'
            : ` Se registraron ${evidenciasCount} evidencias fotográficas del servicio.`;

        let mensaje = `${mensajeBase}${mensajeEvidencias} Puedes calificar el servicio desde la app o hablando con el asistente.`;

        if (reportePdfUrl) {
          mensaje += ` También puedes descargar el reporte PDF del servicio aquí: ${reportePdfUrl}`;
        }

        await this.notificacionesService.notificarCliente(
          ordenActualizada.cliente.id,
          ordenId,
          mensaje,
        );
      }
    } catch (error) {
      console.error(
        'Error enviando notificación de calificación al completar orden:',
        error,
      );
    }

    const respuesta = {
      ...ordenActualizada,
      ...(reportePdfUrl && { reportePdfUrl }),
    };

    console.log('📄 [OrdenesService] Respuesta completarOrden para', ordenId, {
      tieneReportePdfUrl: !!reportePdfUrl,
      reportePdfUrl,
    });

    return respuesta;
  }

  // Calificar servicio
  async calificarServicio(
    ordenId: number,
    calificacion: number,
    comentario?: string,
  ) {
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
    const orden = await this.prisma.orden.findUnique({
      where: { id: ordenId },
      include: {
        cliente: true,
        tecnico: true,
        evidencias: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!orden) {
      return null;
    }

    return this.attachReportePdfUrlIfAvailable(orden);
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
      select: {
        tecnicoid: true,
        estado: true,
        ubicacionLatitud: true,
        ubicacionLongitud: true,
      },
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

    // Auto-actualizar a EN_PROCESO si el técnico llega cerca de la ubicación del cliente
    try {
      if (
        orden.estado === 'ASIGNADO' &&
        orden.ubicacionLatitud != null &&
        orden.ubicacionLongitud != null
      ) {
        const distanceKm = this.calculateDistance(
          orden.ubicacionLatitud,
          orden.ubicacionLongitud,
          lat,
          lng,
        );

        if (distanceKm <= 0.3) {
          await this.prisma.orden.update({
            where: { id: ordenId },
            data: { estado: 'EN_PROCESO' },
          });

          this.notificacionesGateway.broadcastOrdenActualizada(ordenId, {
            estado: 'EN_PROCESO',
            tecnicoId,
          });
        }
      }
    } catch (error) {
      console.error(
        'Error auto-actualizando estado de orden según ubicación del técnico:',
        error,
      );
    }

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

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
