import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AssistantLearningService {
  constructor(private prisma: PrismaService) {}

  // 🧩 Recupera contexto del usuario
  async obtenerContextoUsuario(userId: number) {
    const memorias = await this.prisma.assistantMemory.findMany({
      where: { userId },
    });

    const contexto = memorias.reduce((acc, mem) => {
      acc[mem.key] = mem.value;
      return acc;
    }, {});

    return contexto;
  }

  // 🧠 Registra aprendizaje según feedback humano
  // 🧠 Registra aprendizaje según feedback humano
  async procesarFeedback(messageId: number) {
    const feedbacks = await this.prisma.assistantFeedback.findMany({
      where: { messageId },
    });

    if (feedbacks.length === 0) return null;

    const promedio =
      feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;

    // Si tiene alto puntaje, refuerza esa memoria
    if (promedio >= 4) {
      const mensaje = await this.prisma.assistantMessage.findUnique({
        where: { id: messageId },
        include: { session: true },
      });

      if (mensaje?.content.includes('orden')) {
        await this.prisma.assistantMemory.upsert({
          where: { userId_key: { userId: mensaje.session.userId, key: 'tema_frecuente' } },
          update: { value: 'ordenes' },
          create: {
            userId: mensaje.session.userId,
            key: 'tema_frecuente',
            value: 'ordenes',
          },
        });
      }
    }

    return { message: 'Feedback procesado y memoria actualizada ✅' };
  }

  // 📊 Analiza tendencias generales
  async obtenerEstadisticas() {
    const feedbacks = await this.prisma.assistantFeedback.findMany();
    const positivos = feedbacks.filter((f) => f.rating >= 4).length;
    const negativos = feedbacks.filter((f) => f.rating <= 2).length;
    const total = feedbacks.length || 1;

    return {
      totalInteracciones: total,
      porcentajePositivo: ((positivos / total) * 100).toFixed(1),
      porcentajeNegativo: ((negativos / total) * 100).toFixed(1),
    };
  }
  // Registra "tema_frecuente" simple a partir de palabras clave
  async registrarTemaPorContenido(userId: number, texto: string) {
    const t = (texto || '').toLowerCase();
    let tema = 'general';

    if (/(crear|nueva|registrar).*(orden|incidencia)/.test(t)) tema = 'ordenes';
    else if (/(asignar|técnico|tecnico|disponibilidad)/.test(t)) tema = 'tecnicos';
    else if (/(estado|progreso|en proceso|completado|pendiente)/.test(t)) tema = 'estado';
    else if (/(prioridad|urgente|alta|media|baja)/.test(t)) tema = 'prioridad';

    await this.prisma.assistantMemory.upsert({
      where: { userId_key: { userId, key: 'tema_frecuente' } },
      update: { value: tema, updatedAt: new Date() },
      create: { userId, key: 'tema_frecuente', value: tema },
    });

    // contador por tema (opcional, útil para analítica por usuario)
    const counterKey = `tema_${tema}_count`;
    const existing = await this.prisma.assistantMemory.findUnique({
      where: { userId_key: { userId, key: counterKey } },
    });

    const next = existing ? String(Number(existing.value || '0') + 1) : '1';
    await this.prisma.assistantMemory.upsert({
      where: { userId_key: { userId, key: counterKey } },
      update: { value: next, updatedAt: new Date() },
      create: { userId, key: counterKey, value: next },
    });
  }
}
