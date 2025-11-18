import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { TelegramService } from './telegram.service';
import { GoogleCalendarService } from './google-calendar.service';
import { IntegracionesController } from './integraciones.controller';

@Module({
  controllers: [IntegracionesController],
  providers: [WhatsAppService, TelegramService, GoogleCalendarService],
  exports: [WhatsAppService, TelegramService, GoogleCalendarService],
})
export class IntegracionesModule {}
