import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PrismaModule } from './prisma/prisma.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { TecnicosModule } from './tecnicos/tecnicos.module';
import { AssistantModule } from './assistant/assistant.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { IoTModule } from './iot/iot.module';
import { EmailModule } from './email/email.module';
import { AuditModule } from './audit/audit.module';
import { IntegracionesModule } from './integraciones/integraciones.module';
import { ChatModule } from './chat/chat.module';
import { CacheModule } from './cache/cache.module';
import { EvidenciasModule } from './evidencias/evidencias.module';
import { HealthController } from './health/health.controller';
import { LoggerService } from './common/logger/logger.service';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    // 👇 Carga global del .env
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 🛡️ Rate Limiting (100 requests por minuto por IP)
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 segundos
      limit: 100, // 100 requests
    }]),

    AuthModule,
    UsuariosModule,
    PrismaModule,
    OrdenesModule,
    TecnicosModule,
    AssistantModule,
    NotificacionesModule,
    IoTModule,
    EmailModule,
    AuditModule,
    IntegracionesModule,
    ChatModule, // ✅ Sistema de chat en tiempo real
    CacheModule, // ✅ Sistema de caché
    EvidenciasModule, // ✅ Sistema de evidencias
  ],
  controllers: [
    AppController,
    HealthController, // ✅ Health check endpoints
  ],
  providers: [
    AppService,
    LoggerService, // ✅ Logging estructurado
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter, // ✅ Manejo global de errores
    },
  ],
})
export class AppModule {}
