import { Module, forwardRef } from '@nestjs/common';
import { OrdenesController } from './ordenes.controller';
import { OrdenesService } from './ordenes.service';
import { PdfService } from './pdf.service';
import { UploadService } from './upload.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    PrismaModule,
    NotificacionesModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [OrdenesController],
  providers: [OrdenesService, PdfService, UploadService],
  exports: [OrdenesService],
})
export class OrdenesModule {}
