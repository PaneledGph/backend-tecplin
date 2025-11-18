import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssistantActionsService } from './assistant-actions.service';
import { AssistantMLService } from './assistant-ml.service';
import { AssistantLearningService } from './assistant-learning.service';
import { AssistantHandlersService } from './assistant-handlers.service';
import Groq from 'groq-sdk';

type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };

@Injectable()
export class AssistantService {
  private groq: Groq;
  private readonly MODEL = 'llama-3.3-70b-versatile';
  private readonly MODEL_VERSION = 'v1'; // <- cámbialo cuando actualices prompts/modelo

  constructor(
    private prisma: PrismaService,
    private learning: AssistantLearningService,
    private handlers: AssistantHandlersService,
  ) {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  // -------------------------------------------------------
  // 🔎  CONTEXTO: últimas N interacciones del usuario
  // -------------------------------------------------------
  private async buildConversationContext(userId: number, limit = 8): Promise<ChatMsg[]> {
    const session = await this.prisma.assistantSession.findFirst({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: { role: true, content: true },
        },
      },
    });

    if (!session?.messages?.length) return [];

    // Prisma trae desc → invertimos para mandar cronológico
    const history = [...session.messages].reverse().map((m) => ({
      role: (m.role as 'user' | 'assistant') ?? 'user',
      content: m.content,
    }));

    return history as ChatMsg[];
  }

  // -------------------------------------------------------
  // 📈  Actualiza métricas por intención
  // score: usamos autoFeedback como señal (-1, 0, 1)
  // -------------------------------------------------------
  private async updateIntentStats(intent: string, autoFeedback: number) {
    // Si no versionas, quita "version" del where / create
    // y deja @@unique(intent) en el schema
    await this.prisma.assistantIntentStats.upsert({
      where: { intent_version: { intent, version: this.MODEL_VERSION } as any }, // si no versionas: where: { intent }
      update: {
        total: { increment: 1 },
        scoreSum: { increment: autoFeedback ?? 0 },
      },
      create: {
        intent,
        version: this.MODEL_VERSION,
        total: 1,
        scoreSum: autoFeedback ?? 0,
      },
    });
  }

  // -------------------------------------------------------
  // 🧠  PROCESAR MENSAJE
  // -------------------------------------------------------
  async procesarMensaje(userId: number, texto: string) {
    let respuesta = '';
    let autoFeedback = 0;

    try {
      const contexto = await this.learning.obtenerContextoUsuario(userId);
      const history = await this.buildConversationContext(userId, 8);

      const userRole = await this.handlers.getUserRole(userId);
      
      const systemPrompt = `Eres un asistente técnico inteligente para gestión de órdenes de servicio.

ROL DEL USUARIO: ${userRole}
MEMORIA: ${JSON.stringify(contexto)}

CAPACIDADES:
- Crear órdenes con descripción, prioridad y ubicación
- Ver órdenes del usuario
- Modificar órdenes existentes (descripción, prioridad)
- Cancelar órdenes
- Consultar estado de órdenes
- Asignar técnicos (solo ADMIN)

EXTRACCIÓN INTELIGENTE:
- Si menciona "urgente", "crítico", "emergencia" → prioridad ALTA
- Si menciona "cuando puedas", "no es urgente" → prioridad BAJA
- Si menciona ubicación (planta, edificio, área, piso) → extraer en "ubicacion"
- Si menciona tipo de problema (eléctrico, mecánico, etc.) → extraer en "tipoProblema"
- Si menciona número de orden (#5, orden 3) → extraer en "ordenId"

RESPONDE SOLO EN JSON ESTRICTO:
{
  "intent": "CREAR_ORDEN|VER_ORDENES|MODIFICAR_ORDEN|CANCELAR_ORDEN|CONSULTAR_ESTADO|ASIGNAR_TECNICO|SALUDO|DESCONOCIDO",
  "respuesta": "mensaje natural al usuario",
  "ordenId"?: number,
  "descripcion"?: string,
  "prioridad"?: "BAJA|MEDIA|ALTA",
  "ubicacion"?: string,
  "tipoProblema"?: string,
  "especialidadRequerida"?: string,
  "tecnicoId"?: number
}`;

      const messages: ChatMsg[] = [
        { role: 'system', content: systemPrompt },
        ...history, // contexto conversacional real
        { role: 'user', content: texto },
      ];

      const aiResponse = await this.groq.chat.completions.create({
        model: this.MODEL,
        messages,
      });

      const raw = aiResponse.choices[0]?.message?.content ?? '{}';
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();

      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { intent: 'DESCONOCIDO', respuesta: raw };
      }

      const intent = (parsed.intent || 'DESCONOCIDO').toUpperCase();
      respuesta = parsed.respuesta || 'No entendí tu solicitud.';

      // --------- LÓGICA POR INTENCIÓN (usando handlers) ----------
      let handlerResult: any;

      switch (intent) {
        case 'CREAR_ORDEN':
          handlerResult = await this.handlers.handleCrearOrden(userId, parsed, userRole);
          respuesta = handlerResult.respuesta;
          autoFeedback = handlerResult.autoFeedback;
          await this.guardarMemoria(userId, 'ultima_orden', parsed.descripcion || '');
          await this.learning.registrarTemaPorContenido(userId, parsed.descripcion || '');
          break;

        case 'VER_ORDENES':
          handlerResult = await this.handlers.handleVerOrdenes(userId, userRole);
          respuesta = handlerResult.respuesta;
          autoFeedback = handlerResult.autoFeedback;
          await this.learning.registrarTemaPorContenido(userId, 'ver ordenes');
          break;

        case 'MODIFICAR_ORDEN':
          handlerResult = await this.handlers.handleModificarOrden(userId, parsed, userRole);
          respuesta = handlerResult.respuesta;
          autoFeedback = handlerResult.autoFeedback;
          break;

        case 'CANCELAR_ORDEN':
          handlerResult = await this.handlers.handleCancelarOrden(userId, parsed, userRole);
          respuesta = handlerResult.respuesta;
          autoFeedback = handlerResult.autoFeedback;
          break;

        case 'CONSULTAR_ESTADO':
          handlerResult = await this.handlers.handleConsultarEstado(userId, parsed);
          respuesta = handlerResult.respuesta;
          autoFeedback = handlerResult.autoFeedback;
          break;

        case 'ASIGNAR_TECNICO':
          handlerResult = await this.handlers.handleAsignarTecnico(userId, parsed, userRole);
          respuesta = handlerResult.respuesta;
          autoFeedback = handlerResult.autoFeedback;
          break;

        case 'SALUDO':
          respuesta = '¡Hola! ¿En qué puedo ayudarte hoy? 😊 Puedo crear órdenes, ver tus órdenes, consultar estados y más.';
          autoFeedback = 1;
          break;

        default:
          autoFeedback = -1;
          await this.learning.registrarTemaPorContenido(userId, texto);
          break;
      }

      // --------- SESIÓN & MENSAJES ----------
      let session = await this.prisma.assistantSession.findFirst({ where: { userId } });
      if (!session) {
        session = await this.prisma.assistantSession.create({ data: { userId } });
      } else {
        await this.prisma.assistantSession.update({
          where: { id: session.id },
          data: { lastUsedAt: new Date() },
        });
      }

      await this.prisma.assistantMessage.create({
        data: { sessionId: session.id, role: 'user', content: texto },
      });

      const message = await this.prisma.assistantMessage.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: respuesta,
          intent,
          autoFeedback,
        },
      });

      if (autoFeedback === 1) {
        await this.guardarMemoria(userId, 'ultima_interaccion', texto);
      }

      // refuerzo por feedback humano (si existiera) + stats por intención
      await this.learning.procesarFeedback(message.id);
      await this.updateIntentStats(intent, autoFeedback);

      return { intent, respuesta, autoFeedback };
    } catch (error) {
      console.error('Error al procesar mensaje con Groq:', error);
      return { respuesta: 'Error al conectar con el modelo Groq.' };
    }
  }

  // -------------------------------------------------------
  // 🔧 APOYO
  // -------------------------------------------------------
  async guardarAutoFeedback(messageId: number, autoFeedback: number) {
    const mensaje = await this.prisma.assistantMessage.findUnique({ where: { id: messageId } });
    if (!mensaje) throw new Error(`No existe un mensaje con ID ${messageId}`);

    await this.prisma.assistantMessage.update({ where: { id: messageId }, data: { autoFeedback } });
    return { message: 'AutoFeedback actualizado correctamente ✅' };
  }

  async obtenerMemoria(userId: number) {
    return this.prisma.assistantMemory.findMany({
      where: { userId },
      select: { key: true, value: true },
    });
  }

  async guardarMemoria(userId: number, key: string, value: string) {
    await this.prisma.assistantMemory.upsert({
      where: { userId_key: { userId, key } },
      update: { value, updatedAt: new Date() },
      create: { userId, key, value },
    });
    return { message: 'Memoria guardada correctamente' };
  }

  async guardarFeedback(messageId: number, rating: number, note?: string) {
    const mensaje = await this.prisma.assistantMessage.findUnique({ where: { id: messageId } });
    if (!mensaje) throw new Error(`No existe un mensaje con ID ${messageId}`);

    await this.prisma.assistantFeedback.create({ data: { messageId, rating, note } });
    return { message: 'Feedback recibido. ¡Gracias!' };
  }

  // -------------------------------------------------------
  // 📊  MÉTRICAS (ya usadas por tu dashboard)
  // -------------------------------------------------------
  async obtenerMetricas(reqUser?: any) {
    if (reqUser && reqUser.role && reqUser.role !== 'ADMIN') {
      throw new Error('Acceso denegado: solo administradores');
    }

    const totalMensajes = await this.prisma.assistantMessage.count({ where: { role: 'user' } });

    const intenciones = await this.prisma.assistantMessage.groupBy({
      by: ['intent'],
      _count: { intent: true },
      where: { role: 'assistant' },
    });

    const feedbacks = await this.prisma.assistantFeedback.aggregate({
      _avg: { rating: true },
      _count: { rating: true },
    });

    const usuariosActivos = await this.prisma.assistantSession.groupBy({
      by: ['userId'],
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 5,
    });

    const totalOrdenes = await this.prisma.orden.count();

    const ultimaActividad = await this.prisma.assistantMessage.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return {
      resumen: {
        totalMensajes,
        totalOrdenes,
        promedioSatisfaccion: feedbacks._avg.rating || 0,
        totalFeedbacks: feedbacks._count.rating,
        ultimaActividad: ultimaActividad?.createdAt,
      },
      intenciones,
      usuariosActivos,
    };
  }

  // -------------------------------------------------------
  // 📈 Tendencia semanal (autoFeedback de assistant_message)
  // Devuelve últimas 8 semanas con promedio y conteo
  // -------------------------------------------------------
  async obtenerTendenciaSemanal(weeks = 8) {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const msgs = await this.prisma.assistantMessage.findMany({
      where: {
        role: 'assistant',
        createdAt: { gte: since },
        NOT: { autoFeedback: null },
      },
      select: { createdAt: true, autoFeedback: true },
      orderBy: { createdAt: 'asc' },
    });

    const bucket = new Map<string, { sum: number; count: number }>();
    for (const m of msgs) {
      const d = new Date(m.createdAt);
      // clave por año-semana ISO
      const key = `${d.getUTCFullYear()}-W${isoWeek(d)}`;
      const cur = bucket.get(key) || { sum: 0, count: 0 };
      cur.sum += m.autoFeedback ?? 0;
      cur.count += 1;
      bucket.set(key, cur);
    }

    return Array.from(bucket.entries()).map(([week, v]) => ({
      week,
      avg: v.count ? v.sum / v.count : 0,
      count: v.count,
    }));

    // --- util local ---
    function isoWeek(date: Date) {
      const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      const dayNum = tmp.getUTCDay() || 7;
      tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      return Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7);
    }
  }

  // -------------------------------------------------------
  // 🧠  Estadísticas de aprendizaje (ya tenías)
  // -------------------------------------------------------
  async obtenerEstadisticasAprendizaje() {
    const feedbackStats = await this.prisma.assistantFeedback.findMany();
    const total = feedbackStats.length || 1;
    const positivos = feedbackStats.filter((f) => f.rating >= 4).length;
    const negativos = feedbackStats.filter((f) => f.rating <= 2).length;

    const temas = await this.prisma.assistantMemory.groupBy({
      by: ['value'],
      _count: { value: true },
      where: { key: 'tema_frecuente' },
    });

    return {
      resumen: {
        totalFeedbacks: total,
        porcentajePositivo: ((positivos / total) * 100).toFixed(1),
        porcentajeNegativo: ((negativos / total) * 100).toFixed(1),
      },
      temasFrecuentes: temas.map((t) => ({
        tema: t.value,
        ocurrencias: t._count.value,
      })),
    };
  }
}
