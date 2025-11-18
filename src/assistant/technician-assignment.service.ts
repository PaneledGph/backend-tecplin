import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TechnicianWithDistance {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  especialidad: string;
  estado: 'DISPONIBLE' | 'OCUPADO';
  ubicacionLatitud?: number;
  ubicacionLongitud?: number;
  distance?: number;
  ordenes_activas: number;
}

export interface AssignmentResult {
  success: boolean;
  message: string;
  technician?: TechnicianWithDistance;
  order?: any;
  error?: string;
}

@Injectable()
export class TechnicianAssignmentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calcula la distancia entre dos puntos geográficos (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distancia en km
    return d;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * Obtiene todos los técnicos con su estado calculado
   */
  async getTechniciansWithStatus(): Promise<TechnicianWithDistance[]> {
    const tecnicos = await this.prisma.tecnico.findMany({
      include: {
        usuario: true,
        orden: {
          where: {
            estado: {
              in: ['ASIGNADO', 'EN_PROCESO']
            }
          }
        },
        ubicacionActual: true
      }
    });

    return tecnicos.map(tecnico => {
      const ordenesActivas = tecnico.orden.length;
      let estado: 'DISPONIBLE' | 'OCUPADO' = 'DISPONIBLE';
      
      // Usar el estado de la base de datos si está disponible, sino calcularlo
      if (tecnico.disponibilidad === 'OCUPADO') {
        estado = 'OCUPADO';
      } else if (ordenesActivas > 0) {
        const tieneEnProceso = tecnico.orden.some(o => o.estado === 'EN_PROCESO');
        estado = tieneEnProceso ? 'OCUPADO' : 'OCUPADO'; // Si tiene órdenes asignadas, está ocupado
      }

      return {
        id: tecnico.id,
        nombre: tecnico.nombre,
        email: tecnico.usuario.usuario + '@tecplin.com', // Usar el username como base del email
        telefono: '', // No está en el modelo actual
        especialidad: tecnico.especialidad || 'General',
        estado,
        ubicacionLatitud: tecnico.ubicacionActual?.lat,
        ubicacionLongitud: tecnico.ubicacionActual?.lng,
        ordenes_activas: ordenesActivas
      };
    });
  }

  /**
   * Encuentra el técnico más cercano disponible
   */
  async findClosestAvailableTechnician(orderLat: number, orderLon: number): Promise<TechnicianWithDistance | null> {
    const tecnicos = await this.getTechniciansWithStatus();
    const disponibles = tecnicos.filter(t => t.estado === 'DISPONIBLE');

    if (disponibles.length === 0) {
      return null;
    }

    // Calcular distancias
    const tecnicosConDistancia = disponibles.map(tecnico => ({
      ...tecnico,
      distance: tecnico.ubicacionLatitud && tecnico.ubicacionLongitud 
        ? this.calculateDistance(orderLat, orderLon, tecnico.ubicacionLatitud, tecnico.ubicacionLongitud)
        : 999 // Si no tiene ubicación, poner distancia muy alta
    }));

    // Ordenar por distancia
    tecnicosConDistancia.sort((a, b) => a.distance - b.distance);

    return tecnicosConDistancia[0];
  }

  /**
   * Encuentra el técnico más disponible (con menos órdenes activas)
   */
  async findMostAvailableTechnician(): Promise<TechnicianWithDistance | null> {
    const tecnicos = await this.getTechniciansWithStatus();
    const disponibles = tecnicos.filter(t => t.estado === 'DISPONIBLE');

    if (disponibles.length === 0) {
      return null;
    }

    // Ordenar por número de órdenes activas (ascendente)
    disponibles.sort((a, b) => a.ordenes_activas - b.ordenes_activas);

    return disponibles[0];
  }

  /**
   * Busca un técnico por nombre
   */
  async findTechnicianByName(name: string): Promise<TechnicianWithDistance | null> {
    const tecnicos = await this.getTechniciansWithStatus();
    
    const found = tecnicos.find(t => 
      t.nombre.toLowerCase().includes(name.toLowerCase()) ||
      t.email.toLowerCase().includes(name.toLowerCase())
    );

    return found || null;
  }

  /**
   * Asigna un técnico a una orden
   */
  async assignTechnicianToOrder(orderId: number, technicianId: number): Promise<AssignmentResult> {
    try {
      // Verificar que la orden existe
      const orden = await this.prisma.orden.findUnique({
        where: { id: orderId },
        include: { cliente: true }
      });

      if (!orden) {
        return {
          success: false,
          message: `No se encontró la orden ${orderId}`,
          error: 'ORDER_NOT_FOUND'
        };
      }

      // Verificar que el técnico existe
      const tecnico = await this.prisma.tecnico.findUnique({
        where: { id: technicianId },
        include: { usuario: true }
      });

      if (!tecnico) {
        return {
          success: false,
          message: `No se encontró el técnico con ID ${technicianId}`,
          error: 'TECHNICIAN_NOT_FOUND'
        };
      }

      // Asignar el técnico a la orden
      const ordenActualizada = await this.prisma.orden.update({
        where: { id: orderId },
        data: {
          tecnicoid: technicianId,
          estado: 'ASIGNADO'
        },
        include: {
          cliente: true,
          tecnico: {
            include: { usuario: true }
          }
        }
      });

      return {
        success: true,
        message: `Orden ${orderId} asignada exitosamente a ${tecnico.nombre}`,
        technician: {
          id: tecnico.id,
          nombre: tecnico.nombre,
          email: tecnico.usuario.usuario + '@tecplin.com',
          telefono: '',
          especialidad: tecnico.especialidad || 'General',
          estado: 'OCUPADO',
          ordenes_activas: 1
        },
        order: ordenActualizada
      };

    } catch (error) {
      console.error('Error asignando técnico:', error);
      return {
        success: false,
        message: 'Error interno al asignar el técnico',
        error: error.message
      };
    }
  }

  /**
   * Asignación automática inteligente
   */
  async autoAssignTechnician(orderId: number): Promise<AssignmentResult> {
    try {
      const orden = await this.prisma.orden.findUnique({
        where: { id: orderId }
      });

      if (!orden) {
        return {
          success: false,
          message: `No se encontró la orden ${orderId}`,
          error: 'ORDER_NOT_FOUND'
        };
      }

      let tecnico: TechnicianWithDistance | null = null;

      // Si la orden tiene ubicación, buscar el más cercano
      if (orden.ubicacionLatitud && orden.ubicacionLongitud) {
        tecnico = await this.findClosestAvailableTechnician(
          orden.ubicacionLatitud, 
          orden.ubicacionLongitud
        );
      }

      // Si no hay técnico cercano o no hay ubicación, buscar el más disponible
      if (!tecnico) {
        tecnico = await this.findMostAvailableTechnician();
      }

      if (!tecnico) {
        return {
          success: false,
          message: 'No hay técnicos disponibles en este momento',
          error: 'NO_AVAILABLE_TECHNICIANS'
        };
      }

      return await this.assignTechnicianToOrder(orderId, tecnico.id);

    } catch (error) {
      console.error('Error en asignación automática:', error);
      return {
        success: false,
        message: 'Error en la asignación automática',
        error: error.message
      };
    }
  }

  /**
   * Actualiza el estado de un técnico cuando completa una orden
   */
  async updateTechnicianStatusOnOrderComplete(orderId: number): Promise<void> {
    try {
      const orden = await this.prisma.orden.findUnique({
        where: { id: orderId },
        include: { 
          tecnico: {
            include: { usuario: true }
          }
        }
      });

      if (orden && orden.tecnico) {
        // Verificar si el técnico tiene otras órdenes activas
        const ordenesActivas = await this.prisma.orden.count({
          where: {
            tecnicoid: orden.tecnicoid,
            estado: {
              in: ['ASIGNADO', 'EN_PROCESO']
            },
            id: {
              not: orderId // Excluir la orden que se está completando
            }
          }
        });

        // Si no tiene más órdenes activas, su estado vuelve a DISPONIBLE
        console.log(`Técnico ${orden.tecnico.nombre} tiene ${ordenesActivas} órdenes activas restantes`);
        
        // Aquí podrías actualizar el estado en la tabla Tecnico si tuvieras un campo de estado
        if (ordenesActivas === 0) {
          await this.prisma.tecnico.update({
            where: { id: orden.tecnico.id },
            data: { disponibilidad: 'DISPONIBLE' }
          });
        }
      }
    } catch (error) {
      console.error('Error actualizando estado del técnico:', error);
    }
  }
}
