import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly apiUrl = `https://api.telegram.org/bot${this.botToken}`;

  // -------------------------------------------------------
  // 📨 ENVIAR MENSAJE
  // -------------------------------------------------------
  async enviarMensaje(chatId: string, mensaje: string): Promise<any> {
    if (!this.botToken) {
      console.warn('⚠️ Telegram no configurado. Configura TELEGRAM_BOT_TOKEN');
      return { success: false, message: 'Telegram no configurado' };
    }

    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text: mensaje,
        parse_mode: 'Markdown',
      });

      console.log(`✅ Mensaje Telegram enviado a ${chatId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(
        '❌ Error al enviar Telegram:',
        error.response?.data || error.message,
      );
      return { success: false, error: error.message };
    }
  }

  // -------------------------------------------------------
  // 📋 NOTIFICAR ORDEN CREADA
  // -------------------------------------------------------
  async notificarOrdenCreada(chatId: string, orden: any): Promise<any> {
    const mensaje =
      `🔔 *Nueva Orden de Servicio*\n\n` +
      `📋 Orden #${orden.id}\n` +
      `📝 ${orden.descripcion}\n` +
      `📍 ${orden.ubicacion || 'No especificada'}\n` +
      `⚡ Prioridad: ${orden.prioridad}\n` +
      `📅 Fecha: ${new Date(orden.fechasolicitud).toLocaleDateString('es-ES')}`;

    return this.enviarMensaje(chatId, mensaje);
  }

  // -------------------------------------------------------
  // 👤 NOTIFICAR TÉCNICO ASIGNADO
  // -------------------------------------------------------
  async notificarTecnicoAsignado(
    chatId: string,
    orden: any,
    tecnico: any,
  ): Promise<any> {
    const mensaje =
      `👤 *Técnico Asignado*\n\n` +
      `📋 Orden #${orden.id}\n` +
      `👷 Técnico: ${tecnico.nombre}\n` +
      `📞 Contacto: ${tecnico.telefono || 'No disponible'}`;

    return this.enviarMensaje(chatId, mensaje);
  }

  // -------------------------------------------------------
  // ✅ NOTIFICAR ORDEN COMPLETADA
  // -------------------------------------------------------
  async notificarOrdenCompletada(chatId: string, orden: any): Promise<any> {
    const mensaje =
      `✅ *Orden Completada*\n\n` +
      `📋 Orden #${orden.id}\n` +
      `📝 ${orden.descripcion}\n` +
      `✅ Estado: COMPLETADO`;

    return this.enviarMensaje(chatId, mensaje);
  }

  // -------------------------------------------------------
  // 🚨 NOTIFICAR ALERTA IoT
  // -------------------------------------------------------
  async notificarAlertaIoT(
    chatId: string,
    alerta: any,
    sensor: any,
  ): Promise<any> {
    const mensaje =
      `🚨 *Alerta IoT*\n\n` +
      `📡 Sensor: ${sensor.codigo}\n` +
      `⚠️ Tipo: ${alerta.tipo}\n` +
      `📊 Valor: ${alerta.valor} ${sensor.unidad || ''}\n` +
      `📅 ${new Date(alerta.timestamp).toLocaleString('es-ES')}`;

    return this.enviarMensaje(chatId, mensaje);
  }

  // -------------------------------------------------------
  // 📊 ENVIAR REPORTE DIARIO
  // -------------------------------------------------------
  async enviarReporteDiario(chatId: string, estadisticas: any): Promise<any> {
    const mensaje =
      `📊 *Reporte Diario*\n\n` +
      `📋 Órdenes totales: ${estadisticas.totalOrdenes}\n` +
      `✅ Completadas: ${estadisticas.completadas}\n` +
      `⏳ Pendientes: ${estadisticas.pendientes}\n` +
      `⚙️ En proceso: ${estadisticas.enProceso}\n` +
      `🚨 Alertas activas: ${estadisticas.alertasActivas}`;

    return this.enviarMensaje(chatId, mensaje);
  }
}
