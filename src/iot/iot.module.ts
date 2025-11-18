import { Module } from '@nestjs/common';
import { IoTService } from './iot.service';
import { PrediccionService } from './prediccion.service';
import { IoTController } from './iot.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificacionesModule } from 'src/notificaciones/notificaciones.module';

@Module({
  imports: [PrismaModule, NotificacionesModule],
  controllers: [IoTController],
  providers: [IoTService, PrediccionService],
  exports: [IoTService, PrediccionService],
})
export class IoTModule {}
