import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 🧠 SERVICIO DE INTELIGENCIA AVANZADA
 * Mejora la inteligencia del asistente con:
 * - Memoria de conversaciones
 * - Contexto por rol
 * - Aprendizaje de patrones
 * - Sugerencias proactivas
 * - Análisis de sentimiento
 */

@Injectable()
export class AssistantIntelligenceService {
  constructor(private prisma: PrismaService) {}

  // -------------------------------------------------------
  // 🧠 CONTEXTO SEGÚN ROL
  // -------------------------------------------------------
  obtenerContextoRol(rol: string): string {
    const contextos = {
      admin: `Eres un asistente IA para ADMINISTRADORES de TecPlin.

CAPACIDADES ESPECIALES:
- Acceso completo a estadísticas del sistema
- Gestión de usuarios y técnicos
- Monitoreo de sensores IoT
- Análisis de rendimiento
- Configuración del sistema
- Ejecución de acciones proactivas

DATOS QUE PUEDES PROPORCIONAR:
- Total de órdenes (pendientes, en proceso, completadas)
- Rendimiento de técnicos (órdenes completadas, tiempo promedio)
- Estado de sensores IoT (activos, alertas, predicciones)
- Usuarios activos y roles
- Métricas de satisfacción
- Problemas recurrentes

ACCIONES QUE PUEDES EJECUTAR:
- Crear/editar/eliminar usuarios
- Asignar técnicos a órdenes
- Reorganizar cargas de trabajo
- Generar reportes
- Configurar alertas
- Ejecutar análisis predictivos

TONO: Profesional, analítico, proactivo`,

      tecnico: `Eres un asistente IA para TÉCNICOS de TecPlin.

CAPACIDADES ESPECIALES:
- Ver órdenes asignadas
- Actualizar estado de órdenes
- Acceder a historial de reparaciones
- Ver ubicaciones de trabajo
- Consultar información de clientes
- Reportar problemas

DATOS QUE PUEDES PROPORCIONAR:
- Órdenes asignadas (pendientes, en proceso)
- Próximas ubicaciones de trabajo
- Información de clientes
- Historial de reparaciones similares
- Estadísticas personales
- Rutas optimizadas

ACCIONES QUE PUEDES EJECUTAR:
- Marcar órdenes como completadas
- Actualizar estado de órdenes
- Agregar notas a órdenes
- Reportar problemas o retrasos
- Solicitar materiales
- Ver instrucciones técnicas

TONO: Práctico, directo, orientado a la acción`,

      cliente: `Eres un asistente IA para CLIENTES de TecPlin.

CAPACIDADES ESPECIALES:
- Crear órdenes de servicio
- Consultar estado de órdenes
- Ver historial de servicios
- Contactar con soporte
- Responder preguntas frecuentes

DATOS QUE PUEDES PROPORCIONAR:
- Estado de órdenes activas
- Historial de servicios
- Técnico asignado
- Tiempo estimado de resolución
- Información de facturación
- Preguntas frecuentes

ACCIONES QUE PUEDES EJECUTAR:
- Crear nueva orden de servicio
- Consultar estado de órdenes
- Modificar órdenes pendientes
- Cancelar órdenes
- Calificar servicio
- Contactar con técnico

TONO: Amable, servicial, empático`,
    };

    return contextos[rol] || contextos.cliente;
  }

  // -------------------------------------------------------
  // 💬 ANALIZAR INTENCIÓN DEL MENSAJE
  // -------------------------------------------------------
  async analizarIntencion(texto: string, rol: string): Promise<any> {
    const textoLower = texto.toLowerCase();

    // Intenciones por rol
    const intenciones = {
      admin: {
        estadisticas: [
          'estadísticas',
          'métricas',
          'rendimiento',
          'dashboard',
          'resumen',
        ],
        usuarios: ['usuarios', 'técnicos', 'crear usuario', 'gestionar'],
        sensores: ['sensores', 'iot', 'temperatura', 'alertas'],
        ordenes: ['órdenes', 'servicios', 'pendientes', 'completadas'],
        proactivo: ['acciones proactivas', 'reorganizar', 'optimizar'],
      },
      tecnico: {
        mis_ordenes: ['mis órdenes', 'asignadas', 'trabajo'],
        completar: ['completar', 'terminar', 'finalizar'],
        ubicacion: ['ubicación', 'dirección', 'donde'],
        actualizar: ['actualizar', 'cambiar estado', 'modificar'],
        reportar: ['reportar', 'problema', 'retraso'],
      },
      cliente: {
        crear_orden: ['crear', 'nueva orden', 'solicitar', 'necesito'],
        estado: ['estado', 'cómo va', 'progreso'],
        historial: ['historial', 'anteriores', 'pasadas'],
        contactar: ['contactar', 'hablar', 'técnico'],
        ayuda: ['ayuda', 'cómo funciona', 'información'],
      },
    };

    const intencionesRol = intenciones[rol] || intenciones.cliente;

    // Detectar intención
    for (const [intencion, palabras] of Object.entries(intencionesRol)) {
      if (
        (palabras as string[]).some((palabra) => textoLower.includes(palabra))
      ) {
        return {
          intencion,
          confianza: 0.8,
          rol,
        };
      }
    }

    return {
      intencion: 'general',
      confianza: 0.5,
      rol,
    };
  }

  // -------------------------------------------------------
  // 📊 OBTENER DATOS SEGÚN INTENCIÓN
  // -------------------------------------------------------
  async obtenerDatosIntencion(
    intencion: string,
    rol: string,
    usuarioId: number,
  ): Promise<any> {
    try {
      switch (intencion) {
        // ADMIN
        case 'estadisticas':
          return await this.obtenerEstadisticasAdmin();

        case 'usuarios':
          return await this.obtenerUsuarios();

        case 'sensores':
          return await this.obtenerEstadoSensores();

        // TÉCNICO
        case 'mis_ordenes':
          return await this.obtenerOrdenesTecnico(usuarioId);

        case 'ubicacion':
          return await this.obtenerProximaUbicacion(usuarioId);

        // CLIENTE
        case 'estado':
          return await this.obtenerOrdenesCliente(usuarioId);

        case 'historial':
          return await this.obtenerHistorialCliente(usuarioId);

        default:
          return null;
      }
    } catch (error) {
      console.error('Error al obtener datos:', error);
      return null;
    }
  }

  // -------------------------------------------------------
  // 📊 ESTADÍSTICAS ADMIN
  // -------------------------------------------------------
  private async obtenerEstadisticasAdmin(): Promise<any> {
    const [ordenes, tecnicos] = await Promise.all([
      this.prisma.orden.groupBy({
        by: ['estado'],
        _count: true,
      }),
      this.prisma.tecnico.count(),
    ]);

    const sensores = await this.prisma.sensor.count();

    return {
      ordenes: ordenes.reduce((acc, o) => {
        acc[o.estado] = o._count;
        return acc;
      }, {} as any),
      totalTecnicos: tecnicos,
      totalSensores: sensores,
    };
  }

  // -------------------------------------------------------
  // 👥 USUARIOS
  // -------------------------------------------------------
  private async obtenerUsuarios(): Promise<any> {
    const usuarios = await this.prisma.usuario.groupBy({
      by: ['rol'],
      _count: true,
    });

    return usuarios.reduce((acc, u) => {
      acc[u.rol] = u._count;
      return acc;
    }, {});
  }

  // -------------------------------------------------------
  // 🏭 ESTADO SENSORES
  // -------------------------------------------------------
  private async obtenerEstadoSensores(): Promise<any> {
    const sensores = await this.prisma.sensor.findMany({
      select: {
        id: true,
        tipo: true,
        ubicacion: true,
      },
      take: 10,
    });

    return sensores;
  }

  // -------------------------------------------------------
  // 📋 ÓRDENES TÉCNICO
  // -------------------------------------------------------
  private async obtenerOrdenesTecnico(usuarioId: number): Promise<any> {
    const tecnico = await this.prisma.tecnico.findFirst({
      where: { usuarioid: usuarioId },
    });

    if (!tecnico) return null;

    const ordenes = await this.prisma.orden.findMany({
      where: {
        tecnicoid: tecnico.id,
        estado: { in: ['ASIGNADO', 'EN_PROCESO'] },
      },
      include: {
        cliente: true,
      },
      orderBy: { fechasolicitud: 'asc' },
      take: 5,
    });

    return ordenes;
  }

  // -------------------------------------------------------
  // 📍 PRÓXIMA UBICACIÓN
  // -------------------------------------------------------
  private async obtenerProximaUbicacion(usuarioId: number): Promise<any> {
    const tecnico = await this.prisma.tecnico.findFirst({
      where: { usuarioid: usuarioId },
    });

    if (!tecnico) return null;

    const proximaOrden = await this.prisma.orden.findFirst({
      where: {
        tecnicoid: tecnico.id,
        estado: { in: ['ASIGNADO', 'EN_PROCESO'] },
      },
      include: {
        cliente: true,
      },
      orderBy: { fechasolicitud: 'asc' },
    });

    return proximaOrden;
  }

  // -------------------------------------------------------
  // 📋 ÓRDENES CLIENTE
  // -------------------------------------------------------
  private async obtenerOrdenesCliente(usuarioId: number): Promise<any> {
    const cliente = await this.prisma.cliente.findFirst({
      where: { usuarioId: usuarioId },
    });

    if (!cliente) return null;

    const ordenes = await this.prisma.orden.findMany({
      where: {
        clienteid: cliente.id,
        estado: { not: 'COMPLETADO' },
      },
      include: {
        tecnico: true,
      },
      orderBy: { fechasolicitud: 'desc' },
      take: 5,
    });

    return ordenes;
  }

  // -------------------------------------------------------
  // 📅 HISTORIAL CLIENTE
  // -------------------------------------------------------
  private async obtenerHistorialCliente(usuarioId: number): Promise<any> {
    const cliente = await this.prisma.cliente.findFirst({
      where: { usuarioId: usuarioId },
    });

    if (!cliente) return null;

    const ordenes = await this.prisma.orden.findMany({
      where: {
        clienteid: cliente.id,
        estado: 'COMPLETADO',
      },
      include: {
        tecnico: true,
      },
      orderBy: { fechaCompletado: 'desc' },
      take: 10,
    });

    return ordenes;
  }

  // -------------------------------------------------------
  // 😊 ANÁLISIS DE SENTIMIENTO
  // -------------------------------------------------------
  analizarSentimiento(texto: string): {
    sentimiento: 'positivo' | 'neutral' | 'negativo';
    confianza: number;
  } {
    const textoLower = texto.toLowerCase();

    const palabrasPositivas = [
      'gracias',
      'excelente',
      'perfecto',
      'bien',
      'genial',
      'bueno',
    ];
    const palabrasNegativas = [
      'problema',
      'mal',
      'error',
      'no funciona',
      'urgente',
      'ayuda',
    ];

    const positivos = palabrasPositivas.filter((p) =>
      textoLower.includes(p),
    ).length;
    const negativos = palabrasNegativas.filter((p) =>
      textoLower.includes(p),
    ).length;

    if (positivos > negativos) {
      return { sentimiento: 'positivo', confianza: 0.7 };
    } else if (negativos > positivos) {
      return { sentimiento: 'negativo', confianza: 0.7 };
    } else {
      return { sentimiento: 'neutral', confianza: 0.5 };
    }
  }

  // -------------------------------------------------------
  // 💡 SUGERENCIAS PROACTIVAS
  // -------------------------------------------------------
  async generarSugerencias(rol: string, usuarioId: number): Promise<string[]> {
    const sugerencias: string[] = [];

    try {
      if (rol === 'admin') {
        // Detectar técnicos sobrecargados
        const tecnicos = await this.prisma.tecnico.findMany({
          include: {
            orden: {
              where: { estado: { in: ['ASIGNADO', 'EN_PROCESO'] } },
            },
          },
        });

        const sobrecargados = tecnicos.filter(
          (t) => (t.orden?.length || 0) > 5,
        );
        if (sobrecargados.length > 0) {
          sugerencias.push(
            `⚠️ ${sobrecargados.length} técnico(s) sobrecargado(s). ¿Reorganizar asignaciones?`,
          );
        }

        // Detectar órdenes atrasadas
        const hace48h = new Date();
        hace48h.setHours(hace48h.getHours() - 48);

        const atrasadas = await this.prisma.orden.count({
          where: {
            estado: { in: ['PENDIENTE', 'ASIGNADO'] },
            fechasolicitud: { lt: hace48h },
          },
        });

        if (atrasadas > 0) {
          sugerencias.push(
            `⏰ ${atrasadas} orden(es) atrasada(s). ¿Priorizar?`,
          );
        }
      }

      if (rol === 'tecnico') {
        const tecnico = await this.prisma.tecnico.findFirst({
          where: { usuarioid: usuarioId },
          include: {
            orden: {
              where: { estado: { in: ['ASIGNADO', 'EN_PROCESO'] } },
            },
          },
        });

        if (tecnico && (tecnico.orden?.length || 0) > 3) {
          sugerencias.push(
            `📋 Tienes ${tecnico.orden?.length} órdenes activas. ¿Necesitas ayuda?`,
          );
        }
      }

      if (rol === 'cliente') {
        const cliente = (await this.prisma.cliente.findFirst({
          where: { usuarioId: usuarioId },
          include: {
            orden: {
              where: { estado: { not: 'COMPLETADO' } },
            },
          },
        })) as any;

        if (cliente && (cliente.orden?.length || 0) === 0) {
          sugerencias.push(`💡 ¿Necesitas crear una nueva orden de servicio?`);
        }
      }
    } catch (error) {
      console.error('Error al generar sugerencias:', error);
    }

    return sugerencias;
  }

  // -------------------------------------------------------
  // 🎯 FORMATEAR RESPUESTA CON DATOS
  // -------------------------------------------------------
  formatearRespuestaConDatos(
    respuestaBase: string,
    datos: any,
    intencion: string,
  ): string {
    if (!datos) return respuestaBase;

    let respuesta = respuestaBase + '\n\n';

    switch (intencion) {
      case 'estadisticas':
        respuesta += `📊 **Estadísticas del Sistema:**\n\n`;
        respuesta += `**Órdenes:**\n`;
        for (const [estado, count] of Object.entries(datos.ordenes || {})) {
          respuesta += `• ${estado}: ${count}\n`;
        }
        respuesta += `\n**Técnicos activos:** ${datos.totalTecnicos}\n`;
        break;

      case 'mis_ordenes':
        if (Array.isArray(datos) && datos.length > 0) {
          respuesta += `📋 **Tus órdenes asignadas:**\n\n`;
          datos.forEach((orden, i) => {
            respuesta += `${i + 1}. **Orden #${orden.id}**\n`;
            respuesta += `   Cliente: ${orden.cliente?.nombre || 'N/A'}\n`;
            respuesta += `   Ubicación: ${orden.ubicacion}\n`;
            respuesta += `   Estado: ${orden.estado}\n\n`;
          });
        } else {
          respuesta += `✅ No tienes órdenes pendientes.`;
        }
        break;

      case 'estado':
        if (Array.isArray(datos) && datos.length > 0) {
          respuesta += `🔍 **Estado de tus órdenes:**\n\n`;
          datos.forEach((orden, i) => {
            respuesta += `${i + 1}. **Orden #${orden.id}**\n`;
            respuesta += `   Estado: ${orden.estado}\n`;
            respuesta += `   Técnico: ${orden.tecnico?.nombre || 'No asignado'}\n\n`;
          });
        } else {
          respuesta += `✅ No tienes órdenes activas.`;
        }
        break;
    }

    return respuesta;
  }
}
