import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AssistantActionsService } from './assistant-actions.service';
import { AssistantMLService } from './assistant-ml.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('assistant/advanced')
export class AssistantAdvancedController {
  constructor(
    private actionsService: AssistantActionsService,
    private mlService: AssistantMLService,
  ) {}

  // -------------------------------------------------------
  // 📋 ACCIONES DEL ASISTENTE
  // -------------------------------------------------------

  @Post('crear-orden')
  @UseGuards(AuthGuard)
  async crearOrden(@Body() body: any) {
    return this.actionsService.crearOrden(body);
  }

  @Post('modificar-orden')
  @UseGuards(AuthGuard)
  async modificarOrden(@Body() body: any) {
    return this.actionsService.modificarOrden(body);
  }

  @Post('asignar-tecnico')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async asignarTecnico(@Body() body: any) {
    return this.actionsService.asignarTecnico(body);
  }

  @Get('estadisticas')
  @UseGuards(AuthGuard)
  async obtenerEstadisticas() {
    return this.actionsService.obtenerEstadisticas();
  }

  @Post('buscar-ordenes')
  @UseGuards(AuthGuard)
  async buscarOrdenes(@Body() params: any) {
    return this.actionsService.buscarOrdenes(params);
  }

  @Get('ordenes-problematicas')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async detectarOrdenesProblematicas() {
    return this.actionsService.detectarOrdenesProblematicas();
  }

  @Post('reorganizar-asignaciones')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async reorganizarAsignaciones() {
    return this.actionsService.reorganizarAsignaciones();
  }

  // -------------------------------------------------------
  // 🧠 MACHINE LEARNING
  // -------------------------------------------------------

  @Get('perfil-usuario/:userId')
  @UseGuards(AuthGuard)
  async entrenarPerfilUsuario(@Param('userId') userId: string) {
    return this.mlService.entrenarPerfilUsuario(parseInt(userId));
  }

  @Get('predecir-demanda')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async predecirDemandaMantenimiento() {
    return this.mlService.predecirDemandaMantenimiento();
  }

  @Get('predecir-tiempo/:ordenId')
  @UseGuards(AuthGuard)
  async predecirTiempoResolucion(@Param('ordenId') ordenId: string) {
    return this.mlService.predecirTiempoResolucion(parseInt(ordenId));
  }

  @Get('clientes-recurrentes')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async detectarClientesRecurrentes() {
    return this.mlService.detectarClientesRecurrentes();
  }

  @Get('acciones-proactivas')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async ejecutarAccionesProactivas() {
    return this.mlService.ejecutarAccionesProactivas();
  }
}
