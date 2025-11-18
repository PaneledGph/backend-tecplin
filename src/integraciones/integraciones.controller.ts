import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { TelegramService } from './telegram.service';
import { GoogleCalendarService } from './google-calendar.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('integraciones')
export class IntegracionesController {
  constructor(
    private whatsappService: WhatsAppService,
    private telegramService: TelegramService,
    private googleCalendarService: GoogleCalendarService,
  ) {}

  // -------------------------------------------------------
  // 📱 WHATSAPP
  // -------------------------------------------------------
  @Post('whatsapp/enviar')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async enviarWhatsApp(@Body() body: { telefono: string; mensaje: string }) {
    return this.whatsappService.enviarMensaje(body.telefono, body.mensaje);
  }

  @Post('whatsapp/notificar-orden')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'TECNICO')
  async notificarOrdenWhatsApp(@Body() body: { telefono: string; orden: any }) {
    return this.whatsappService.notificarOrdenCreada(body.telefono, body.orden);
  }

  // -------------------------------------------------------
  // 💬 TELEGRAM
  // -------------------------------------------------------
  @Post('telegram/enviar')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async enviarTelegram(@Body() body: { chatId: string; mensaje: string }) {
    return this.telegramService.enviarMensaje(body.chatId, body.mensaje);
  }

  @Post('telegram/notificar-orden')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'TECNICO')
  async notificarOrdenTelegram(@Body() body: { chatId: string; orden: any }) {
    return this.telegramService.notificarOrdenCreada(body.chatId, body.orden);
  }

  @Post('telegram/reporte-diario')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async enviarReporteDiario(@Body() body: { chatId: string; estadisticas: any }) {
    return this.telegramService.enviarReporteDiario(body.chatId, body.estadisticas);
  }

  // -------------------------------------------------------
  // 📅 GOOGLE CALENDAR
  // -------------------------------------------------------
  @Post('calendar/crear-evento')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async crearEvento(@Body() body: any) {
    return this.googleCalendarService.crearEvento(body);
  }

  @Post('calendar/crear-evento-orden')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'TECNICO')
  async crearEventoOrden(@Body() body: { orden: any; tecnico?: any }) {
    return this.googleCalendarService.crearEventoOrden(body.orden, body.tecnico);
  }
}
