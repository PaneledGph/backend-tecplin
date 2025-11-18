import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('notificaciones')
@UseGuards(AuthGuard)
export class NotificacionesController {
  constructor(private notificacionesService: NotificacionesService) {}

  @Get()
  async obtenerNotificaciones(@Req() req) {
    const userId = req.user.sub;
    return this.notificacionesService.obtenerNotificaciones(userId);
  }

  @Get('no-leidas/count')
  async contarNoLeidas(@Req() req) {
    const userId = req.user.sub;
    const count = await this.notificacionesService.contarNoLeidas(userId);
    return { count };
  }

  @Patch(':id/marcar-leida')
  async marcarLeida(@Param('id') id: string) {
    return this.notificacionesService.marcarLeida(Number(id));
  }

  @Patch('marcar-todas-leidas')
  async marcarTodasLeidas(@Req() req) {
    const userId = req.user.sub;
    return this.notificacionesService.marcarTodasLeidas(userId);
  }
}
