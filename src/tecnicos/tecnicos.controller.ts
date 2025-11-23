import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  Body,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TecnicosService } from './tecnicos.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Disponibilidad } from '@prisma/client';
import { AlertaGpsDto } from './dto/alerta-gps.dto';

@Controller('tecnicos')
@UseGuards(AuthGuard, RolesGuard)
export class TecnicosController {
  constructor(private tecnicosService: TecnicosService) {}

  // Listar todos los técnicos (solo ADMIN)
  @Get()
  @Roles('ADMIN')
  obtenerTodos() {
    return this.tecnicosService.obtenerTodos();
  }

  // Listar solo técnicos DISPONIBLES para asignación
  @Get('disponibles')
  @Roles('ADMIN')
  obtenerDisponibles() {
    return this.tecnicosService.obtenerDisponibles();
  }

  // Ubicaciones en vivo para panel de admin
  @Get('ubicaciones')
  @Roles('ADMIN')
  obtenerUbicaciones() {
    return this.tecnicosService.obtenerUbicacionesTecnicos();
  }

  // Consultar técnico específico (ADMIN o el propio técnico)
  @Get('perfil/:id')
  @Roles('ADMIN', 'TECNICO')
  obtenerPorId(@Param('id') id: string) {
    return this.tecnicosService.obtenerPorId(Number(id));
  }

  // Cambiar disponibilidad (solo el técnico o admin)
  @Patch(':id/disponibilidad')
  @Roles('ADMIN', 'TECNICO')
  actualizarDisponibilidad(
    @Param('id') id: string,
    @Body('disponibilidad') disponibilidad: Disponibilidad,
  ) {
    return this.tecnicosService.actualizarDisponibilidad(
      Number(id),
      disponibilidad,
    );
  }

  // Obtener órdenes asignadas al técnico logueado
  @Get('mis-ordenes')
  @Roles('TECNICO')
  async obtenerOrdenesAsignadas(@Req() req) {
    const usuarioId = req.user.sub;
    return this.tecnicosService.obtenerOrdenesAsignadasPorUsuario(usuarioId);
  }

  // Sincronizar usuarios TECNICO que no tienen registro en tabla tecnico
  @Post('sincronizar')
  @Roles('ADMIN')
  async sincronizarTecnicos() {
    return this.tecnicosService.sincronizarTecnicos();
  }

  @Post('alertas-gps')
  @Roles('ADMIN')
  registrarAlertasGps(@Body() body: AlertaGpsDto) {
    return this.tecnicosService.registrarAlertasGps(body);
  }

  @Get(':id/ruta-historica')
  @Roles('ADMIN')
  obtenerRutaHistorica(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const limitNumber = limit ? Number(limit) : undefined;
    return this.tecnicosService.obtenerRutaHistorica(Number(id), limitNumber);
  }
}
