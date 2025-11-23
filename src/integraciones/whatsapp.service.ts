import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WhatsAppService {
  private readonly apiUrl =
    process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  private readonly accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  // -------------------------------------------------------
  // 📱 ENVIAR MENSAJE DE TEXTO
  // -------------------------------------------------------
  async enviarMensaje(to: string, mensaje: string): Promise<any> {
    if (!this.accessToken || !this.phoneNumberId) {
      console.warn(
        '⚠️ WhatsApp no configurado. Configura WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID',
      );
      return { success: false, message: 'WhatsApp no configurado' };
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to.replace(/\D/g, ''), // Solo números
          type: 'text',
          text: {
            body: mensaje,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log(`✅ Mensaje WhatsApp enviado a ${to}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(
        '❌ Error al enviar WhatsApp:',
        error.response?.data || error.message,
      );
      return { success: false, error: error.message };
    }
  }

  // -------------------------------------------------------
  // 📋 ENVIAR NOTIFICACIÓN DE ORDEN CREADA
  // -------------------------------------------------------
  async notificarOrdenCreada(telefono: string, orden: any): Promise<any> {
    const mensaje =
      `🔔 *Nueva Orden de Servicio*\n\n` +
      `📋 Orden #${orden.id}\n` +
      `📝 ${orden.descripcion}\n` +
      `📍 ${orden.ubicacion || 'No especificada'}\n` +
      `⚡ Prioridad: ${orden.prioridad}\n` +
      `📅 Fecha: ${new Date(orden.fechasolicitud).toLocaleDateString('es-ES')}\n\n` +
      `Gracias por confiar en nosotros.`;

    return this.enviarMensaje(telefono, mensaje);
  }

  // -------------------------------------------------------
  // 👤 ENVIAR NOTIFICACIÓN DE TÉCNICO ASIGNADO
  // -------------------------------------------------------
  async notificarTecnicoAsignado(
    telefono: string,
    orden: any,
    tecnico: any,
  ): Promise<any> {
    const mensaje =
      `👤 *Técnico Asignado*\n\n` +
      `📋 Orden #${orden.id}\n` +
      `👷 Técnico: ${tecnico.nombre}\n` +
      `📞 Contacto: ${tecnico.telefono || 'No disponible'}\n\n` +
      `El técnico se pondrá en contacto contigo pronto.`;

    return this.enviarMensaje(telefono, mensaje);
  }

  // -------------------------------------------------------
  // ✅ ENVIAR NOTIFICACIÓN DE ORDEN COMPLETADA
  // -------------------------------------------------------
  async notificarOrdenCompletada(telefono: string, orden: any): Promise<any> {
    const mensaje =
      `✅ *Orden Completada*\n\n` +
      `📋 Orden #${orden.id}\n` +
      `📝 ${orden.descripcion}\n` +
      `✅ Estado: COMPLETADO\n\n` +
      `¡Gracias por tu preferencia!`;

    return this.enviarMensaje(telefono, mensaje);
  }

  // -------------------------------------------------------
  // 🚨 ENVIAR ALERTA IoT
  // -------------------------------------------------------
  async notificarAlertaIoT(
    telefono: string,
    alerta: any,
    sensor: any,
  ): Promise<any> {
    const mensaje =
      `🚨 *Alerta IoT*\n\n` +
      `📡 Sensor: ${sensor.codigo}\n` +
      `⚠️ Tipo: ${alerta.tipo}\n` +
      `📊 Valor: ${alerta.valor} ${sensor.unidad || ''}\n` +
      `📅 ${new Date(alerta.timestamp).toLocaleString('es-ES')}\n\n` +
      `Se requiere atención inmediata.`;

    return this.enviarMensaje(telefono, mensaje);
  }
}
