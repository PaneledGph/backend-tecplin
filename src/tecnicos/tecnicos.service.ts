import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Disponibilidad } from '@prisma/client';
import { AlertaGpsDto, TipoAlertaGps } from './dto/alerta-gps.dto';

@Injectable()
export class TecnicosService {
  constructor(private prisma: PrismaService) {}

  // Obtener todos los técnicos
  async obtenerTodos() {
    return this.prisma.tecnico.findMany({
      include: { usuario: true },
      orderBy: { id: 'asc' },
    });
  }

  async registrarAlertasGps(dto: AlertaGpsDto) {
    // Por ahora solo registramos en consola y devolvemos confirmación.
    console.log('[ALERTA GPS]', dto.tipo, dto.technicianIds, dto.mensaje ?? '');
    return {
      ok: true,
      tipo: dto.tipo,
      technicianIds: dto.technicianIds,
    };
  }

  async obtenerRutaHistorica(tecnicoId: number, limit: number = 200) {
    const puntos = await this.prisma.tecnicoUbicacionLog.findMany({
      where: { tecnicoId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      tecnicoId,
      totalPuntos: puntos.length,
      puntos,
    };
  }

  // Obtener solo técnicos DISPONIBLES
  async obtenerDisponibles() {
    return this.prisma.tecnico.findMany({
      where: { disponibilidad: 'DISPONIBLE' },
      include: { usuario: true },
      orderBy: { id: 'asc' },
    });
  }

  // Obtener un técnico por su ID
  async obtenerPorId(id: number) {
    return this.prisma.tecnico.findUnique({
      where: { id },
      include: { usuario: true, orden: true }, // asegúrate de que en tu schema sea "ordenes"
    });
  }

  // Cambiar disponibilidad de un técnico
  async actualizarDisponibilidad(id: number, disponibilidad: Disponibilidad) {
    return this.prisma.tecnico.update({
      where: { id },
      data: { disponibilidad },
    });
  }

  // Obtener órdenes asignadas a un técnico
  async obtenerOrdenesAsignadas(tecnicoid: number) {
    return this.prisma.orden.findMany({
      where: { tecnicoid }, // ✅ minúsculas según tu BD
      include: { cliente: true },
      orderBy: { fechasolicitud: 'desc' }, // ✅ minúsculas según tu BD
    });
  }

  // Obtener órdenes del técnico basado en el usuarioId
  async obtenerOrdenesAsignadasPorUsuario(usuarioId: number) {
    // Primero buscar el técnico asociado al usuario
    let tecnico = await this.prisma.tecnico.findUnique({
      where: { usuarioid: usuarioId },
    });

    // Si no existe, crear el registro automáticamente
    if (!tecnico) {
      console.log(`⚠️ No se encontró técnico para usuario ${usuarioId}, creando registro...`);
      
      // Obtener información del usuario
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: usuarioId },
      });

      if (!usuario || usuario.rol !== 'TECNICO') {
        throw new Error('El usuario no tiene rol de técnico');
      }

      // Crear el registro de técnico
      tecnico = await this.prisma.tecnico.create({
        data: {
          nombre: usuario.usuario, // Usar el nombre de usuario como nombre
          especialidad: 'General', // Especialidad por defecto
          disponibilidad: 'DISPONIBLE',
          usuarioid: usuarioId,
        },
      });

      console.log(`✅ Técnico creado automáticamente: ${tecnico.nombre} (ID: ${tecnico.id})`);
    }

    // Luego obtener las órdenes del técnico
    return this.obtenerOrdenesAsignadas(tecnico.id);
  }

  async obtenerUbicacionesTecnicos() {
    return this.prisma.tecnicoUbicacion.findMany({
      include: {
        tecnico: {
          include: { usuario: true },
        },
        orden: {
          include: { cliente: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Sincronizar todos los usuarios TECNICO que no tienen registro
  async sincronizarTecnicos() {
    // Buscar usuarios con rol TECNICO que no tienen registro en tabla tecnico
    const usuarios = await this.prisma.usuario.findMany({
      where: { rol: 'TECNICO' },
    });

    const tecnicosCreados: any[] = [];
    const tecnicosExistentes: any[] = [];

    for (const usuario of usuarios) {
      // Verificar si ya tiene registro
      const tecnicoExistente = await this.prisma.tecnico.findUnique({
        where: { usuarioid: usuario.id },
      });

      if (tecnicoExistente) {
        tecnicosExistentes.push(tecnicoExistente);
      } else {
        // Crear registro
        const nuevoTecnico = await this.prisma.tecnico.create({
          data: {
            nombre: usuario.usuario,
            especialidad: 'General',
            disponibilidad: 'DISPONIBLE',
            usuarioid: usuario.id,
          },
        });
        tecnicosCreados.push(nuevoTecnico);
        console.log(`✅ Técnico creado: ${nuevoTecnico.nombre} (ID: ${nuevoTecnico.id})`);
      }
    }

    return {
      mensaje: 'Sincronización completada',
      tecnicosCreados: tecnicosCreados.length,
      tecnicosExistentes: tecnicosExistentes.length,
      total: usuarios.length,
      nuevos: tecnicosCreados,
    };
  }
}
