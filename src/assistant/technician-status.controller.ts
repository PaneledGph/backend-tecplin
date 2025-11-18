import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { TechnicianAssignmentService } from './technician-assignment.service';

@Controller('technicians')
@UseGuards(AuthGuard)
export class TechnicianStatusController {
  constructor(
    private readonly technicianAssignment: TechnicianAssignmentService
  ) {}

  /**
   * Obtiene todos los técnicos con su estado actual
   */
  @Get('status')
  async getTechniciansStatus() {
    try {
      const tecnicos = await this.technicianAssignment.getTechniciansWithStatus();
      
      return {
        success: true,
        data: tecnicos,
        summary: {
          total: tecnicos.length,
          disponibles: tecnicos.filter(t => t.estado === 'DISPONIBLE').length,
          ocupados: tecnicos.filter(t => t.estado === 'OCUPADO').length
        }
      };
    } catch (error) {
      console.error('Error obteniendo estado de técnicos:', error);
      return {
        success: false,
        message: 'Error al consultar el estado de los técnicos',
        error: error.message
      };
    }
  }

  /**
   * Encuentra el técnico más cercano a una ubicación
   */
  @Post('find-closest')
  async findClosestTechnician(@Body() body: { lat: number; lon: number }) {
    try {
      const { lat, lon } = body;
      
      if (!lat || !lon) {
        return {
          success: false,
          message: 'Se requieren las coordenadas lat y lon'
        };
      }

      const tecnico = await this.technicianAssignment.findClosestAvailableTechnician(lat, lon);
      
      if (!tecnico) {
        return {
          success: false,
          message: 'No hay técnicos disponibles en este momento'
        };
      }

      return {
        success: true,
        data: tecnico,
        message: `Técnico más cercano: ${tecnico.nombre} a ${tecnico.distance?.toFixed(2)} km`
      };
    } catch (error) {
      console.error('Error buscando técnico más cercano:', error);
      return {
        success: false,
        message: 'Error al buscar técnico más cercano',
        error: error.message
      };
    }
  }

  /**
   * Encuentra el técnico más disponible (con menos órdenes)
   */
  @Get('most-available')
  async findMostAvailableTechnician() {
    try {
      const tecnico = await this.technicianAssignment.findMostAvailableTechnician();
      
      if (!tecnico) {
        return {
          success: false,
          message: 'No hay técnicos disponibles en este momento'
        };
      }

      return {
        success: true,
        data: tecnico,
        message: `Técnico más disponible: ${tecnico.nombre} con ${tecnico.ordenes_activas} órdenes activas`
      };
    } catch (error) {
      console.error('Error buscando técnico más disponible:', error);
      return {
        success: false,
        message: 'Error al buscar técnico más disponible',
        error: error.message
      };
    }
  }

  /**
   * Busca un técnico por nombre
   */
  @Get('search/:name')
  async searchTechnicianByName(@Param('name') name: string) {
    try {
      const tecnico = await this.technicianAssignment.findTechnicianByName(name);
      
      if (!tecnico) {
        return {
          success: false,
          message: `No se encontró ningún técnico con el nombre "${name}"`
        };
      }

      return {
        success: true,
        data: tecnico,
        message: `Técnico encontrado: ${tecnico.nombre}`
      };
    } catch (error) {
      console.error('Error buscando técnico por nombre:', error);
      return {
        success: false,
        message: 'Error al buscar técnico por nombre',
        error: error.message
      };
    }
  }

  /**
   * Asigna un técnico a una orden específica
   */
  @Post('assign')
  async assignTechnicianToOrder(@Body() body: { orderId: number; technicianId?: number; criteria?: string }) {
    try {
      const { orderId, technicianId, criteria } = body;
      
      if (!orderId) {
        return {
          success: false,
          message: 'Se requiere el ID de la orden'
        };
      }

      let result;

      if (technicianId) {
        // Asignación específica
        result = await this.technicianAssignment.assignTechnicianToOrder(orderId, technicianId);
      } else {
        // Asignación automática
        result = await this.technicianAssignment.autoAssignTechnician(orderId);
      }

      return result;
    } catch (error) {
      console.error('Error asignando técnico:', error);
      return {
        success: false,
        message: 'Error al asignar técnico',
        error: error.message
      };
    }
  }
}
