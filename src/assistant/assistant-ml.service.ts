import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface PerfilUsuario {
  usuarioId: number;
  temasRecurrentes: { [tema: string]: number };
  patronesUso: {
    horaPreferida: number;
    diasActivo: number[];
    tiempoPromedioSesion: number;
  };
  satisfaccion: {
    promedio: number;
    preguntasRepetidas: number;
    frustacionDetectada: number;
  };
  predicciones: {
    proximaNecesidad: string;
    probabilidad: number;
  };
}

@Injectable()
export class AssistantMLService {
  constructor(private prisma: PrismaService) {}

  // -------------------------------------------------------
  // 🧠 ENTRENAMIENTO PERSONALIZADO POR USUARIO
  // -------------------------------------------------------
  async entrenarPerfilUsuario(usuarioId: number): Promise<PerfilUsuario> {
    // Obtener historial de conversaciones
    // Usar AssistantSession en lugar de conversacion
    const conversaciones = (await this.prisma.assistantSession.findMany({
      where: { userId: usuarioId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
      orderBy: { lastUsedAt: 'desc' },
      take: 50,
    })) as any;

    // Analizar temas recurrentes
    const temasRecurrentes = this.analizarTemasRecurrentes(conversaciones);

    // Analizar patrones de uso
    const patronesUso = this.analizarPatronesUso(conversaciones);

    // Analizar satisfacción
    const satisfaccion = await this.analizarSatisfaccion(
      usuarioId,
      conversaciones,
    );

    // Generar predicciones
    const predicciones = this.generarPredicciones(
      temasRecurrentes,
      patronesUso,
    );

    const perfil: PerfilUsuario = {
      usuarioId,
      temasRecurrentes,
      patronesUso,
      satisfaccion,
      predicciones,
    };

    // Guardar perfil en caché (podrías usar Redis)
    console.log(`🧠 Perfil de usuario ${usuarioId} actualizado`);

    return perfil;
  }

  // -------------------------------------------------------
  // 📊 ANALIZAR TEMAS RECURRENTES
  // -------------------------------------------------------
  private analizarTemasRecurrentes(conversaciones: any[]): {
    [tema: string]: number;
  } {
    const temas: { [key: string]: number } = {};
    const palabrasClave = {
      ordenes: ['orden', 'servicio', 'reparación', 'problema', 'solicitud'],
      tecnicos: ['técnico', 'asignar', 'disponible', 'ocupado'],
      estado: ['estado', 'progreso', 'completado', 'pendiente'],
      urgente: ['urgente', 'prioridad', 'rápido', 'inmediato'],
      ubicacion: ['ubicación', 'dirección', 'lugar', 'donde'],
      pago: ['pago', 'factura', 'costo', 'precio'],
    };

    for (const conv of conversaciones) {
      for (const mensaje of conv.messages || []) {
        const texto = (mensaje.content || '').toLowerCase();

        for (const [tema, palabras] of Object.entries(palabrasClave)) {
          if (palabras.some((palabra) => texto.includes(palabra))) {
            temas[tema] = (temas[tema] || 0) + 1;
          }
        }
      }
    }

    return temas;
  }

  // -------------------------------------------------------
  // ⏰ ANALIZAR PATRONES DE USO
  // -------------------------------------------------------
  private analizarPatronesUso(conversaciones: any[]): any {
    if (conversaciones.length === 0) {
      return {
        horaPreferida: 12,
        diasActivo: [1, 2, 3, 4, 5],
        tiempoPromedioSesion: 5,
      };
    }

    // Analizar horas de uso
    const horas: { [hora: number]: number } = {};
    const dias: { [dia: number]: number } = {};
    const duraciones: number[] = [];

    for (const conv of conversaciones) {
      const fecha = new Date(conv.createdAt);
      const hora = fecha.getHours();
      const dia = fecha.getDay();

      horas[hora] = (horas[hora] || 0) + 1;
      dias[dia] = (dias[dia] || 0) + 1;

      // Calcular duración (aproximada por número de mensajes)
      const duracion = (conv.messages?.length || 0) * 0.5; // 30 segundos por mensaje
      duraciones.push(duracion);
    }

    // Hora preferida (la más frecuente)
    const horaPreferida = parseInt(
      Object.entries(horas).sort((a, b) => b[1] - a[1])[0]?.[0] || '12',
    );

    // Días activos (ordenados por frecuencia)
    const diasActivo = Object.entries(dias)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((d) => parseInt(d[0]));

    // Tiempo promedio de sesión
    const tiempoPromedioSesion =
      duraciones.length > 0
        ? duraciones.reduce((a, b) => a + b, 0) / duraciones.length
        : 5;

    return {
      horaPreferida,
      diasActivo,
      tiempoPromedioSesion: Math.round(tiempoPromedioSesion),
    };
  }

  // -------------------------------------------------------
  // 😊 ANALIZAR SATISFACCIÓN (FEEDBACK IMPLÍCITO)
  // -------------------------------------------------------
  private async analizarSatisfaccion(
    usuarioId: number,
    conversaciones: any[],
  ): Promise<any> {
    let preguntasRepetidas = 0;
    let frustacionDetectada = 0;
    const preguntasVistas = new Set<string>();

    // Palabras que indican frustración
    const palabrasFrustracion = [
      'no entiendo',
      'no funciona',
      'error',
      'mal',
      'problema',
      'ayuda',
      'no puedo',
      'otra vez',
    ];

    for (const conv of conversaciones) {
      for (const mensaje of conv.messages || []) {
        if (mensaje.role === 'user') {
          const texto = (mensaje.content || '').toLowerCase();

          // Detectar preguntas repetidas
          const preguntaNormalizada = texto.substring(0, 50);
          if (preguntasVistas.has(preguntaNormalizada)) {
            preguntasRepetidas++;
          }
          preguntasVistas.add(preguntaNormalizada);

          // Detectar frustración
          if (palabrasFrustracion.some((palabra) => texto.includes(palabra))) {
            frustacionDetectada++;
          }
        }
      }
    }

    // Obtener feedback explícito
    // Feedback no existe en schema, usar valor por defecto
    const feedbacks: any[] = [];

    const promedioFeedback =
      feedbacks.length > 0
        ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
        : 3;

    // Calcular satisfacción general (0-5)
    let satisfaccionPromedio = promedioFeedback;

    // Penalizar por preguntas repetidas y frustración
    if (preguntasRepetidas > 5) satisfaccionPromedio -= 0.5;
    if (frustacionDetectada > 3) satisfaccionPromedio -= 0.5;

    satisfaccionPromedio = Math.max(0, Math.min(5, satisfaccionPromedio));

    return {
      promedio: Math.round(satisfaccionPromedio * 10) / 10,
      preguntasRepetidas,
      frustacionDetectada,
    };
  }

  // -------------------------------------------------------
  // 🔮 GENERAR PREDICCIONES
  // -------------------------------------------------------
  private generarPredicciones(
    temasRecurrentes: { [tema: string]: number },
    patronesUso: any,
  ): any {
    // Encontrar tema más recurrente
    const temaTop = Object.entries(temasRecurrentes).sort(
      (a, b) => b[1] - a[1],
    )[0];

    if (!temaTop) {
      return {
        proximaNecesidad: 'consulta_general',
        probabilidad: 0.5,
      };
    }

    const [tema, frecuencia] = temaTop;
    const totalMensajes = Object.values(temasRecurrentes).reduce(
      (a, b) => a + b,
      0,
    );
    const probabilidad = frecuencia / totalMensajes;

    const predicciones: { [key: string]: string } = {
      ordenes: 'crear_orden',
      tecnicos: 'consultar_tecnico',
      estado: 'verificar_estado',
      urgente: 'orden_urgente',
      ubicacion: 'actualizar_ubicacion',
      pago: 'consultar_pago',
    };

    return {
      proximaNecesidad: predicciones[tema] || 'consulta_general',
      probabilidad: Math.round(probabilidad * 100) / 100,
    };
  }

  // -------------------------------------------------------
  // 📈 PREDECIR DEMANDA DE MANTENIMIENTO
  // -------------------------------------------------------
  async predecirDemandaMantenimiento(): Promise<any> {
    // Obtener órdenes de los últimos 90 días
    const hace90dias = new Date();
    hace90dias.setDate(hace90dias.getDate() - 90);

    const ordenes = await this.prisma.orden.findMany({
      where: {
        fechasolicitud: { gte: hace90dias },
      },
      select: {
        tipoProblema: true,
        fechasolicitud: true,
        prioridad: true,
      },
    });

    // Agrupar por tipo de problema
    const tipoProblemas: { [tipo: string]: number[] } = {};

    for (const orden of ordenes) {
      const tipo = orden.tipoProblema || 'General';
      if (!tipoProblemas[tipo]) {
        tipoProblemas[tipo] = [];
      }
      tipoProblemas[tipo].push(1);
    }

    // Calcular tendencias
    const predicciones: any[] = [];

    for (const [tipo, ocurrencias] of Object.entries(tipoProblemas)) {
      const total = ocurrencias.length;
      const promedioPorMes = total / 3; // 90 días = 3 meses

      // Predicción simple: promedio + 10% de crecimiento
      const prediccionProximoMes = Math.round(promedioPorMes * 1.1);

      predicciones.push({
        tipoProblema: tipo,
        ocurrenciasUltimos90Dias: total,
        promedioMensual: Math.round(promedioPorMes),
        prediccionProximoMes,
        tendencia:
          prediccionProximoMes > promedioPorMes ? 'CRECIENTE' : 'ESTABLE',
      });
    }

    // Ordenar por predicción (mayor a menor)
    predicciones.sort(
      (a, b) => b.prediccionProximoMes - a.prediccionProximoMes,
    );

    return {
      predicciones,
      totalOrdenes: ordenes.length,
      promedioMensual: Math.round(ordenes.length / 3),
    };
  }

  // -------------------------------------------------------
  // ⏱️ PREDECIR TIEMPO DE RESOLUCIÓN
  // -------------------------------------------------------
  async predecirTiempoResolucion(ordenId: number): Promise<any> {
    const orden = await this.prisma.orden.findUnique({
      where: { id: ordenId },
    });

    if (!orden) {
      return { error: 'Orden no encontrada' };
    }

    // Obtener órdenes similares completadas
    const ordenesSimilares = await this.prisma.orden.findMany({
      where: {
        tipoProblema: orden.tipoProblema,
        prioridad: orden.prioridad,
        estado: 'COMPLETADO',
      },
      select: {
        fechasolicitud: true,
        fechaCompletado: true,
      },
      take: 50,
    });

    if (ordenesSimilares.length === 0) {
      return {
        tiempoEstimadoHoras: 24,
        confianza: 'BAJA',
        mensaje: 'Estimación basada en promedio general',
      };
    }

    // Calcular tiempos de resolución
    const tiempos = ordenesSimilares
      .filter((o) => o.fechaCompletado)
      .map((o) => {
        const inicio = new Date(o.fechasolicitud).getTime();
        const fin = new Date(o.fechaCompletado!).getTime();
        return (fin - inicio) / (1000 * 60 * 60); // Horas
      });

    const promedioHoras = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;

    // Ajustar por prioridad
    let ajuste = 1;
    if (orden.prioridad === 'ALTA') ajuste = 0.7;
    if (orden.prioridad === 'BAJA') ajuste = 1.3;

    const tiempoEstimado = Math.round(promedioHoras * ajuste);

    return {
      tiempoEstimadoHoras: tiempoEstimado,
      confianza: ordenesSimilares.length > 20 ? 'ALTA' : 'MEDIA',
      basadoEn: ordenesSimilares.length,
      mensaje: `Estimación: ${tiempoEstimado} horas (basado en ${ordenesSimilares.length} órdenes similares)`,
    };
  }

  // -------------------------------------------------------
  // 🚨 DETECTAR CLIENTES CON ALTA RECURRENCIA
  // -------------------------------------------------------
  async detectarClientesRecurrentes(): Promise<any> {
    const hace30dias = new Date();
    hace30dias.setDate(hace30dias.getDate() - 30);

    const clientes = await this.prisma.cliente.findMany({
      include: {
        orden: {
          where: {
            fechasolicitud: { gte: hace30dias },
          },
        },
      },
    });

    const clientesRecurrentes = clientes
      .filter((c) => (c.orden?.length || 0) >= 3) // 3 o más órdenes en 30 días
      .map((c) => ({
        clienteId: c.id,
        nombre: c.nombre,
        email: c.email,
        telefono: c.telefono,
        ordenesUltimos30Dias: c.orden?.length || 0,
        tiposProblemas: [
          ...new Set((c.orden || []).map((o: any) => o.tipoProblema)),
        ],
        necesitaAtencion: (c.orden?.length || 0) >= 5,
      }))
      .sort((a, b) => b.ordenesUltimos30Dias - a.ordenesUltimos30Dias);

    return {
      total: clientesRecurrentes.length,
      clientes: clientesRecurrentes,
      recomendacion:
        clientesRecurrentes.length > 0
          ? 'Considera ofrecer plan de mantenimiento preventivo'
          : 'No hay clientes con alta recurrencia',
    };
  }

  // -------------------------------------------------------
  // 🤖 ACCIÓN PROACTIVA: DETECTAR Y ACTUAR
  // -------------------------------------------------------
  async ejecutarAccionesProactivas(): Promise<any> {
    const acciones: any[] = [];

    // 1. Detectar sobrecarga de técnicos
    const tecnicos = await this.prisma.tecnico.findMany({
      include: {
        orden: {
          where: {
            estado: { in: ['ASIGNADO', 'EN_PROCESO'] },
          },
        },
      },
    });

    const tecnicosSobrecargados = tecnicos.filter(
      (t) => (t.orden?.length || 0) > 5,
    );

    if (tecnicosSobrecargados.length > 0) {
      acciones.push({
        tipo: 'SOBRECARGA_DETECTADA',
        mensaje: `⚠️ ${tecnicosSobrecargados.length} técnico(s) sobrecargado(s)`,
        recomendacion: 'Reorganizar asignaciones o contratar más técnicos',
        tecnicos: tecnicosSobrecargados.map((t) => ({
          nombre: t.nombre,
          ordenesActivas: t.orden?.length || 0,
        })),
      });
    }

    // 2. Detectar órdenes atrasadas
    const hace48h = new Date();
    hace48h.setHours(hace48h.getHours() - 48);

    const ordenesAtrasadas = await this.prisma.orden.count({
      where: {
        estado: { in: ['PENDIENTE', 'ASIGNADO'] },
        fechasolicitud: { lt: hace48h },
      },
    });

    if (ordenesAtrasadas > 0) {
      acciones.push({
        tipo: 'ORDENES_ATRASADAS',
        mensaje: `⏰ ${ordenesAtrasadas} orden(es) atrasada(s)`,
        recomendacion: 'Priorizar órdenes antiguas',
        cantidad: ordenesAtrasadas,
      });
    }

    // 3. Detectar clientes insatisfechos
    // Feedback no existe en schema, usar 0
    const feedbacksBajos = 0;

    if (feedbacksBajos > 0) {
      acciones.push({
        tipo: 'SATISFACCION_BAJA',
        mensaje: `😞 ${feedbacksBajos} feedback(s) negativo(s) reciente(s)`,
        recomendacion: 'Contactar clientes y mejorar servicio',
        cantidad: feedbacksBajos,
      });
    }

    console.log(`🤖 ${acciones.length} acción(es) proactiva(s) detectada(s)`);

    return {
      timestamp: new Date(),
      accionesDetectadas: acciones.length,
      acciones,
    };
  }
}
