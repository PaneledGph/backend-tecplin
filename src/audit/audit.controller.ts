import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('audit')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN') // Solo administradores pueden ver logs
export class AuditController {
  constructor(private auditService: AuditService) {}

  // -------------------------------------------------------
  // 📊 OBTENER LOGS CON FILTROS
  // -------------------------------------------------------
  @Get('logs')
  async obtenerLogs(
    @Query('usuarioId') usuarioId?: string,
    @Query('accion') accion?: string,
    @Query('entidad') entidad?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.obtenerLogs({
      usuarioId: usuarioId ? parseInt(usuarioId) : undefined,
      accion,
      entidad,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  // -------------------------------------------------------
  // 📈 ESTADÍSTICAS
  // -------------------------------------------------------
  @Get('estadisticas')
  async obtenerEstadisticas(
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.auditService.obtenerEstadisticas(
      fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta ? new Date(fechaHasta) : undefined,
    );
  }

  // -------------------------------------------------------
  // 🔍 LOGS POR ENTIDAD
  // -------------------------------------------------------
  @Get('entidad')
  async obtenerLogsPorEntidad(
    @Query('entidad') entidad: string,
    @Query('entidadId') entidadId: string,
  ) {
    return this.auditService.obtenerLogsPorEntidad(
      entidad,
      parseInt(entidadId),
    );
  }
}
