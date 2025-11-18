import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  UseGuards, 
  Req 
} from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('assistant')
@UseGuards(AuthGuard, RolesGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  /** 🧠 Procesar mensaje del usuario */
  @Post('message')
  async procesarMensaje(@Req() req, @Body('texto') texto: string) {
    const userId = req.user.sub;
    return this.assistantService.procesarMensaje(userId, texto);
  }

  /** 💾 Obtener memorias del usuario */
  @Get('memory')
  async obtenerMemoria(@Req() req) {
    const userId = req.user.sub;
    return this.assistantService.obtenerMemoria(userId);
  }

  /** 🧩 Guardar o actualizar una memoria */
  @Post('memory')
  async guardarMemoria(
    @Req() req,
    @Body('key') key: string,
    @Body('value') value: string,
  ) {
    const userId = req.user.sub;
    return this.assistantService.guardarMemoria(userId, key, value);
  }

  /** ⭐ Guardar feedback manual */
  @Post('feedback')
  async enviarFeedback(
    @Body('messageId') messageId: number,
    @Body('rating') rating: number,
    @Body('note') note?: string,
  ) {
    return this.assistantService.guardarFeedback(messageId, rating, note);
  }

  /** 🤖 Guardar feedback automático */
  @Post('auto-feedback')
  async guardarAutoFeedback(
    @Body() body: { messageId: number; autoFeedback: number },
  ) {
    return this.assistantService.guardarAutoFeedback(body.messageId, body.autoFeedback);
  }

  /** 📊 Métricas del asistente (solo ADMIN) */
  @Roles('ADMIN')
  @Get('metrics')
  async obtenerMetricas(@Req() req) {
    return this.assistantService.obtenerMetricas(req.user);
  }

  /** 🧠 Estadísticas de aprendizaje (solo ADMIN) */
  @Roles('ADMIN')
  @Get('learning-stats')
  async obtenerEstadisticasAprendizaje() {
    return this.assistantService.obtenerEstadisticasAprendizaje();
  }

  @Get('weekly-trend')
  async obtenerTendenciaSemanal(@Req() req) {
    const user = req.user;
    if (user.rol !== 'ADMIN') {
      throw new Error('Acceso denegado: solo administradores');
    }
    return this.assistantService.obtenerTendenciaSemanal(8);
  }
}
