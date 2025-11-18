import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IoTService } from './iot.service';
import { PrediccionService } from './prediccion.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { TipoSensor } from '@prisma/client';

@Controller('iot')
export class IoTController {
  constructor(
    private iotService: IoTService,
    private prediccionService: PrediccionService,
  ) {}

  // -------------------------------------------------------
  // 📊 CREAR SENSOR (solo ADMIN)
  // -------------------------------------------------------
  @Post('sensores')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async crearSensor(
    @Body()
    body: {
      codigo: string;
      tipo: TipoSensor;
      ubicacion: string;
      umbralMin?: number;
      umbralMax?: number;
    },
  ) {
    return this.iotService.crearSensor(body);
  }

  // -------------------------------------------------------
  // 📈 REGISTRAR LECTURA (endpoint público para sensores)
  // -------------------------------------------------------
  @Post('lecturas')
  async registrarLectura(
    @Body() body: { sensorCodigo: string; valor: number },
  ) {
    return this.iotService.registrarLectura(body.sensorCodigo, body.valor);
  }

  // -------------------------------------------------------
  // 🔍 OBTENER SENSORES
  // -------------------------------------------------------
  @Get('sensores')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'TECNICO')
  async obtenerSensores(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tipo') tipo?: TipoSensor,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.iotService.obtenerSensores(pageNum, limitNum, tipo);
  }

  @Get('sensores/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'TECNICO')
  async obtenerSensor(@Param('id') id: string) {
    return this.iotService.obtenerSensor(Number(id));
  }

  // -------------------------------------------------------
  // 🚨 ALERTAS
  // -------------------------------------------------------
  @Get('alertas/activas')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'TECNICO')
  async obtenerAlertasActivas() {
    return this.iotService.obtenerAlertasActivas();
  }

  @Patch('alertas/:id/resolver')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'TECNICO')
  async resolverAlerta(@Param('id') id: string) {
    return this.iotService.resolverAlerta(Number(id));
  }

  // -------------------------------------------------------
  // ⚙️ ACTUALIZAR SENSOR
  // -------------------------------------------------------
  @Patch('sensores/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async actualizarSensor(
    @Param('id') id: string,
    @Body() body: { umbralMin?: number; umbralMax?: number; activo?: boolean },
  ) {
    return this.iotService.actualizarSensor(Number(id), body);
  }

  // -------------------------------------------------------
  // 📈 OBTENER LECTURAS HISTÓRICAS
  // -------------------------------------------------------
  @Get('sensores/:id/lecturas')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'TECNICO')
  async obtenerLecturas(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.iotService.obtenerLecturas(
      Number(id),
      limit ? parseInt(limit) : 100,
      fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta ? new Date(fechaHasta) : undefined,
    );
  }

  // -------------------------------------------------------
  // 🔮 PREDICCIÓN DE FALLOS
  // -------------------------------------------------------
  @Get('prediccion/fallos')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'TECNICO')
  async predecirFallos() {
    return this.prediccionService.predecirFallos();
  }

  @Get('prediccion/estadisticas')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async obtenerEstadisticasPrediccion() {
    return this.prediccionService.obtenerEstadisticas();
  }
}
