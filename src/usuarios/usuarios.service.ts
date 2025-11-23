import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Rol } from '@prisma/client'; // 👈 importamos el enum

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 100, rol?: string) {
    const skip = (page - 1) * limit;
    const where = rol ? { rol: rol as Rol } : {};

    const [usuarios, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return {
      data: usuarios,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByUsuario(usuario: string) {
    return this.prisma.usuario.findUnique({ where: { usuario } });
  }

  async findById(id: number) {
    return this.prisma.usuario.findUnique({
      where: { id },
      include: {
        tecnico: true,
        cliente: true,
      },
    });
  }

  // Crear usuario nuevo
  async create(data: { usuario: string; contrasena: string; rol: string }) {
    // Crear el usuario
    const nuevoUsuario = await this.prisma.usuario.create({
      data: {
        usuario: data.usuario,
        contrasena: data.contrasena,
        rol: data.rol as Rol, // 👈 convierte string a tipo enum Rol
      },
    });

    // Si el rol es TECNICO, crear automáticamente el registro en la tabla tecnicos
    if (data.rol === 'TECNICO') {
      await this.prisma.tecnico.create({
        data: {
          usuarioid: nuevoUsuario.id,
          nombre: data.usuario, // Puedes cambiarlo por un campo nombre si lo tienes
          disponibilidad: 'DISPONIBLE', // Estado inicial
        },
      });
    }

    // Si el rol es CLIENTE, crear automáticamente el registro en la tabla clientes
    if (data.rol === 'CLIENTE') {
      await this.prisma.cliente.create({
        data: {
          usuarioId: nuevoUsuario.id, // ✅ camelCase para Cliente
          nombre: data.usuario, // Puedes cambiarlo por un campo nombre si lo tienes
        },
      });
    }

    return nuevoUsuario;
  }

  // Actualizar usuario
  async update(
    id: number,
    data: { usuario?: string; contrasena?: string; rol?: string },
  ) {
    const updateData: any = {};

    if (data.usuario) updateData.usuario = data.usuario;
    if (data.contrasena) updateData.contrasena = data.contrasena;
    if (data.rol) updateData.rol = data.rol as Rol;

    return this.prisma.usuario.update({
      where: { id },
      data: updateData,
    });
  }

  // Eliminar usuario
  async remove(id: number) {
    // Primero eliminar registros relacionados
    const usuario = await this.findById(id);

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    // Eliminar refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: { usuarioId: id },
    });

    // Eliminar notificaciones
    await this.prisma.notificacion.deleteMany({
      where: { usuarioId: id },
    });

    // Eliminar sesiones del asistente y sus mensajes
    const sessions = await this.prisma.assistantSession.findMany({
      where: { userId: id },
    });

    for (const session of sessions) {
      await this.prisma.assistantMessage.deleteMany({
        where: { sessionId: session.id },
      });
    }

    await this.prisma.assistantSession.deleteMany({
      where: { userId: id },
    });

    // Eliminar memoria del asistente
    await this.prisma.assistantMemory.deleteMany({
      where: { userId: id },
    });

    // Eliminar técnico o cliente
    if (usuario.tecnico) {
      await this.prisma.tecnico.delete({ where: { id: usuario.tecnico.id } });
    }

    if (usuario.cliente) {
      await this.prisma.cliente.delete({ where: { id: usuario.cliente.id } });
    }

    // Finalmente eliminar el usuario
    return this.prisma.usuario.delete({ where: { id } });
  }
}
