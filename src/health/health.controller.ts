import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check completo del sistema' })
  @ApiResponse({ status: 200, description: 'Sistema funcionando correctamente' })
  @ApiResponse({ status: 500, description: 'Error en el sistema' })
  async check() {
    const startTime = Date.now();
    
    try {
      // Verificar conexión a base de datos
      await this.prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
        responseTime: `${responseTime}ms`,
        environment: process.env.NODE_ENV || 'development',
        version: '2.0.0',
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message,
      };
    }
  }

  @Get('ping')
  @ApiOperation({ summary: 'Ping rápido para verificar disponibilidad' })
  @ApiResponse({ status: 200, description: 'Pong' })
  ping() {
    return { message: 'pong', timestamp: new Date().toISOString() };
  }
}
