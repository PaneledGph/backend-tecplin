import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';

@Injectable()
export class GoogleCalendarService {
  private calendar;
  private auth;

  constructor() {
    this.inicializar();
  }

  // -------------------------------------------------------
  // 🔧 INICIALIZAR GOOGLE CALENDAR
  // -------------------------------------------------------
  private async inicializar() {
    try {
      // Configurar autenticación con Service Account
      const credentials = process.env.GOOGLE_CREDENTIALS
        ? JSON.parse(process.env.GOOGLE_CREDENTIALS)
        : null;

      if (!credentials) {
        console.warn('⚠️ Google Calendar no configurado. Configura GOOGLE_CREDENTIALS');
        return;
      }

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });

      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      console.log('✅ Google Calendar inicializado');
    } catch (error) {
      console.error('❌ Error al inicializar Google Calendar:', error.message);
    }
  }

  // -------------------------------------------------------
  // 📅 CREAR EVENTO
  // -------------------------------------------------------
  async crearEvento(evento: {
    titulo: string;
    descripcion: string;
    fechaInicio: Date;
    fechaFin: Date;
    ubicacion?: string;
    asistentes?: string[];
  }): Promise<any> {
    if (!this.calendar) {
      console.warn('⚠️ Google Calendar no disponible');
      return { success: false, message: 'Google Calendar no configurado' };
    }

    try {
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: {
          summary: evento.titulo,
          description: evento.descripcion,
          location: evento.ubicacion,
          start: {
            dateTime: evento.fechaInicio.toISOString(),
            timeZone: 'America/Bogota',
          },
          end: {
            dateTime: evento.fechaFin.toISOString(),
            timeZone: 'America/Bogota',
          },
          attendees: evento.asistentes?.map((email) => ({ email })),
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 1 día antes
              { method: 'popup', minutes: 30 }, // 30 minutos antes
            ],
          },
        },
      });

      console.log(`✅ Evento creado en Google Calendar: ${response.data.htmlLink}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Error al crear evento:', error.message);
      return { success: false, error: error.message };
    }
  }

  // -------------------------------------------------------
  // 📋 CREAR EVENTO PARA ORDEN
  // -------------------------------------------------------
  async crearEventoOrden(orden: any, tecnico?: any): Promise<any> {
    const fechaInicio = new Date(orden.fechasolicitud);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setHours(fechaFin.getHours() + 2); // 2 horas de duración

    const asistentes: string[] = [];
    if (orden.cliente?.email) asistentes.push(orden.cliente.email);
    if (tecnico?.email) asistentes.push(tecnico.email);

    return this.crearEvento({
      titulo: `Orden #${orden.id} - ${orden.descripcion}`,
      descripcion: `📋 Orden de Servicio\n\n` +
        `Descripción: ${orden.descripcion}\n` +
        `Cliente: ${orden.cliente?.nombre || 'N/A'}\n` +
        `Técnico: ${tecnico?.nombre || 'Sin asignar'}\n` +
        `Prioridad: ${orden.prioridad}\n` +
        `Estado: ${orden.estado}`,
      fechaInicio,
      fechaFin,
      ubicacion: orden.ubicacion,
      asistentes,
    });
  }

  // -------------------------------------------------------
  // 🔄 ACTUALIZAR EVENTO
  // -------------------------------------------------------
  async actualizarEvento(eventoId: string, cambios: any): Promise<any> {
    if (!this.calendar) {
      return { success: false, message: 'Google Calendar no configurado' };
    }

    try {
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

      const response = await this.calendar.events.patch({
        calendarId,
        eventId: eventoId,
        requestBody: cambios,
      });

      console.log(`✅ Evento actualizado en Google Calendar`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Error al actualizar evento:', error.message);
      return { success: false, error: error.message };
    }
  }

  // -------------------------------------------------------
  // 🗑️ ELIMINAR EVENTO
  // -------------------------------------------------------
  async eliminarEvento(eventoId: string): Promise<any> {
    if (!this.calendar) {
      return { success: false, message: 'Google Calendar no configurado' };
    }

    try {
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

      await this.calendar.events.delete({
        calendarId,
        eventId: eventoId,
      });

      console.log(`✅ Evento eliminado de Google Calendar`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error al eliminar evento:', error.message);
      return { success: false, error: error.message };
    }
  }

  // -------------------------------------------------------
  // 📅 LISTAR EVENTOS
  // -------------------------------------------------------
  async listarEventos(fechaInicio?: Date, fechaFin?: Date): Promise<any> {
    if (!this.calendar) {
      return { success: false, message: 'Google Calendar no configurado' };
    }

    try {
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

      const response = await this.calendar.events.list({
        calendarId,
        timeMin: (fechaInicio || new Date()).toISOString(),
        timeMax: fechaFin?.toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return { success: true, data: response.data.items };
    } catch (error) {
      console.error('❌ Error al listar eventos:', error.message);
      return { success: false, error: error.message };
    }
  }
}
