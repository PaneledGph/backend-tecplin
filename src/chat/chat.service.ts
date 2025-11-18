import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // Crear conversación entre usuario y técnico/admin
  async createConversation(userId1: number, userId2: number) {
    // Verificar si ya existe una conversación
    const existing = await this.prisma.conversacion.findFirst({
      where: {
        OR: [
          { AND: [{ usuario1Id: userId1 }, { usuario2Id: userId2 }] },
          { AND: [{ usuario1Id: userId2 }, { usuario2Id: userId1 }] },
        ],
      },
    });

    if (existing) {
      return existing;
    }

    // Crear nueva conversación
    return this.prisma.conversacion.create({
      data: {
        usuario1Id: userId1,
        usuario2Id: userId2,
      },
      include: {
        usuario1: {
          select: { 
            id: true, 
            usuario: true, 
            rol: true,
            cliente: { select: { nombre: true, email: true } },
            tecnico: { select: { nombre: true } },
          },
        },
        usuario2: {
          select: { 
            id: true, 
            usuario: true, 
            rol: true,
            cliente: { select: { nombre: true, email: true } },
            tecnico: { select: { nombre: true } },
          },
        },
      },
    });
  }

  // Obtener conversaciones de un usuario
  async getUserConversations(userId: number) {
    return this.prisma.conversacion.findMany({
      where: {
        OR: [{ usuario1Id: userId }, { usuario2Id: userId }],
      },
      include: {
        usuario1: {
          select: { 
            id: true, 
            usuario: true, 
            rol: true,
            cliente: { select: { nombre: true, email: true } },
            tecnico: { select: { nombre: true } },
          },
        },
        usuario2: {
          select: { 
            id: true, 
            usuario: true, 
            rol: true,
            cliente: { select: { nombre: true, email: true } },
            tecnico: { select: { nombre: true } },
          },
        },
        mensajes: {
          orderBy: { creadoEn: 'desc' },
          take: 1, // Último mensaje
        },
      },
      orderBy: {
        actualizadoEn: 'desc',
      },
    });
  }

  // Enviar mensaje
  async sendMessage(conversacionId: number, remitenteId: number, contenido: string) {
    const mensaje = await this.prisma.mensaje.create({
      data: {
        conversacionId,
        remitenteId,
        contenido,
      },
      include: {
        remitente: {
          select: { 
            id: true, 
            usuario: true, 
            rol: true,
            cliente: { select: { nombre: true, email: true } },
            tecnico: { select: { nombre: true } },
          },
        },
      },
    });

    // Actualizar timestamp de conversación
    await this.prisma.conversacion.update({
      where: { id: conversacionId },
      data: { actualizadoEn: new Date() },
    });

    return mensaje;
  }

  // Obtener mensajes de una conversación
  async getMessages(conversacionId: number, limit = 50, offset = 0) {
    return this.prisma.mensaje.findMany({
      where: { conversacionId },
      include: {
        remitente: {
          select: { 
            id: true, 
            usuario: true, 
            rol: true,
            cliente: { select: { nombre: true, email: true } },
            tecnico: { select: { nombre: true } },
          },
        },
      },
      orderBy: { creadoEn: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  // Marcar mensajes como leídos
  async markAsRead(conversacionId: number, userId: number) {
    return this.prisma.mensaje.updateMany({
      where: {
        conversacionId,
        remitenteId: { not: userId },
        leido: false,
      },
      data: {
        leido: true,
        leidoEn: new Date(),
      },
    });
  }

  // Obtener mensajes no leídos
  async getUnreadCount(userId: number) {
    const conversaciones = await this.prisma.conversacion.findMany({
      where: {
        OR: [{ usuario1Id: userId }, { usuario2Id: userId }],
      },
      select: { id: true },
    });

    const conversacionIds = conversaciones.map((c) => c.id);

    return this.prisma.mensaje.count({
      where: {
        conversacionId: { in: conversacionIds },
        remitenteId: { not: userId },
        leido: false,
      },
    });
  }

  // Buscar técnicos y admins disponibles para chat
  async getAvailableStaff() {
    return this.prisma.usuario.findMany({
      where: {
        rol: { in: ['TECNICO', 'ADMIN'] },
      },
      select: {
        id: true,
        usuario: true,
        rol: true,
        cliente: { select: { nombre: true, email: true } },
        tecnico: { select: { nombre: true } },
      },
      orderBy: {
        usuario: 'asc',
      },
    });
  }

  // Crear conversación para una orden específica
  async createConversationForOrder(
    clienteUserId: number,
    tecnicoUserId: number,
    ordenId: number,
  ) {
    // Verificar si ya existe una conversación para esta orden
    const existing = await this.prisma.conversacion.findUnique({
      where: { ordenId },
    });

    if (existing) {
      console.log(`💬 Ya existe conversación para orden #${ordenId}`);
      return existing;
    }

    // Crear nueva conversación vinculada a la orden
    return this.prisma.conversacion.create({
      data: {
        usuario1Id: clienteUserId,
        usuario2Id: tecnicoUserId,
        ordenId,
        activa: true,
      },
      include: {
        usuario1: {
          select: {
            id: true,
            usuario: true,
            rol: true,
            cliente: { select: { nombre: true, email: true } },
          },
        },
        usuario2: {
          select: {
            id: true,
            usuario: true,
            rol: true,
            tecnico: { select: { nombre: true } },
          },
        },
        orden: {
          select: {
            id: true,
            descripcion: true,
            estado: true,
          },
        },
      },
    });
  }

  // Cerrar conversación por orden
  async closeConversationByOrder(ordenId: number) {
    const conversacion = await this.prisma.conversacion.findUnique({
      where: { ordenId },
    });

    if (!conversacion) {
      console.log(`💬 No hay conversación para orden #${ordenId}`);
      return null;
    }

    return this.prisma.conversacion.update({
      where: { id: conversacion.id },
      data: {
        activa: false,
        cerradoEn: new Date(),
      },
    });
  }

  // Obtener conversación por orden
  async getConversationByOrder(ordenId: number) {
    return this.prisma.conversacion.findUnique({
      where: { ordenId },
      include: {
        usuario1: {
          select: {
            id: true,
            usuario: true,
            rol: true,
            cliente: { select: { nombre: true, email: true } },
            tecnico: { select: { nombre: true } },
          },
        },
        usuario2: {
          select: {
            id: true,
            usuario: true,
            rol: true,
            cliente: { select: { nombre: true, email: true } },
            tecnico: { select: { nombre: true } },
          },
        },
        orden: {
          select: {
            id: true,
            descripcion: true,
            estado: true,
          },
        },
        mensajes: {
          orderBy: { creadoEn: 'desc' },
          take: 1,
        },
      },
    });
  }
}
