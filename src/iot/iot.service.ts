import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificacionesService } from 'src/notificaciones/notificaciones.service';
import { NotificacionesGateway } from 'src/notificaciones/notificaciones.gateway';
import { TipoSensor, TipoAlerta } from '@prisma/client';

@Injectable()
export class IoTService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private notificacionesService: NotificacionesService,
    private notificacionesGateway: NotificacionesGateway,
  ) {}

  onModuleInit() {
    console.log('🏭 Módulo IoT inicializado');
    // Aquí se conectaría al broker MQTT si estuviera configurado
    // this.connectMQTT();
  }

  // -------------------------------------------------------
  // 📊 CREAR SENSOR
  // -------------------------------------------------------
  async crearSensor(data: {
    codigo: string;
    tipo: TipoSensor;
    ubicacion: string;
    umbralMin?: number;
    umbralMax?: number;
  }) {
    return this.prisma.sensor.create({
      data: {
        codigo: data.codigo,
        tipo: data.tipo,
        ubicacion: data.ubicacion,
        umbralMin: data.umbralMin,
        umbralMax: data.umbralMax,
      },
    });
  }

  // -------------------------------------------------------
  // 📈 REGISTRAR LECTURA
  // -------------------------------------------------------
  async registrarLectura(sensorCodigo: string, valor: number) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { codigo: sensorCodigo },
    });

    if (!sensor) {
      throw new Error(`Sensor ${sensorCodigo} no encontrado`);
    }

    if (!sensor.activo) {
      throw new Error(`Sensor ${sensorCodigo} está inactivo`);
    }

    // Guardar lectura
    const lectura = await this.prisma.lectura.create({
      data: {
        sensorId: sensor.id,
        valor,
      },
    });

    // Verificar umbrales
    await this.verificarUmbrales(sensor, valor);

    return lectura;
  }

  // -------------------------------------------------------
  // ⚠️ VERIFICAR UMBRALES
  // -------------------------------------------------------
  private async verificarUmbrales(sensor: any, valor: number) {
    let alertaGenerada = false;
    let tipoAlerta: TipoAlerta | null = null;
    let mensaje = '';

    if (sensor.umbralMax && valor > sensor.umbralMax) {
      tipoAlerta = 'UMBRAL_SUPERADO';
      mensaje = `⚠️ Sensor ${sensor.codigo} superó umbral máximo: ${valor} > ${sensor.umbralMax}`;
      alertaGenerada = true;
    } else if (sensor.umbralMin && valor < sensor.umbralMin) {
      tipoAlerta = 'UMBRAL_INFERIOR';
      mensaje = `⚠️ Sensor ${sensor.codigo} por debajo de umbral mínimo: ${valor} < ${sensor.umbralMin}`;
      alertaGenerada = true;
    }

    if (alertaGenerada && tipoAlerta) {
      console.log(`🚨 ${mensaje}`);

      // Crear alerta
      const alerta = await this.prisma.alerta.create({
        data: {
          sensorId: sensor.id,
          tipo: tipoAlerta,
          mensaje,
          valor,
        },
      });

      // 🤖 Crear orden automáticamente
      const orden = await this.crearOrdenAutomatica(sensor, alerta);

      if (orden) {
        // Actualizar alerta con orden
        await this.prisma.alerta.update({
          where: { id: alerta.id },
          data: { ordenId: orden.id },
        });

        // Notificar administradores
        await this.notificarAdministradores(mensaje, orden);
      }
    }
  }

  // -------------------------------------------------------
  // 🤖 CREAR ORDEN AUTOMÁTICA
  // -------------------------------------------------------
  private async crearOrdenAutomatica(sensor: any, alerta: any) {
    const descripcion = `🏭 Alerta IoT: ${alerta.mensaje}. Ubicación: ${sensor.ubicacion}`;

    // Buscar cliente asociado a la ubicación
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        OR: [
          { direccion: { contains: sensor.ubicacion, mode: 'insensitive' } },
          { nombre: { contains: sensor.ubicacion, mode: 'insensitive' } },
        ],
      },
    });

    if (!cliente) {
      console.warn(
        `⚠️ No se encontró cliente para ubicación: ${sensor.ubicacion}`,
      );
      // Crear con el primer cliente disponible o admin
      const primerCliente = await this.prisma.cliente.findFirst();
      if (!primerCliente) {
        console.error('❌ No hay clientes en el sistema');
        return null;
      }
      return this.crearOrden(primerCliente.id, descripcion, sensor);
    }

    return this.crearOrden(cliente.id, descripcion, sensor);
  }

  private async crearOrden(
    clienteId: number,
    descripcion: string,
    sensor: any,
  ) {
    const orden = await this.prisma.orden.create({
      data: {
        descripcion,
        prioridad: 'ALTA', // Alertas IoT siempre alta prioridad
        clienteid: clienteId,
        estado: 'PENDIENTE',
        ubicacion: sensor.ubicacion,
        tipoProblema: this.getTipoProblema(sensor.tipo),
        especialidadRequerida: this.getEspecialidad(sensor.tipo),
      },
    });

    // 🧠 Asignar técnico automáticamente
    const tecnico = await this.findBestTechnician(sensor.tipo);
    if (tecnico) {
      await this.prisma.orden.update({
        where: { id: orden.id },
        data: {
          tecnicoid: tecnico.id,
          estado: 'ASIGNADO',
        },
      });

      await this.notificacionesService.notificarTecnico(tecnico.id, orden.id);
    }

    return orden;
  }

  // -------------------------------------------------------
  // 🔧 BUSCAR MEJOR TÉCNICO
  // -------------------------------------------------------
  private async findBestTechnician(tipoSensor: TipoSensor) {
    const especialidadMap = {
      TEMPERATURA: 'HVAC',
      PRESION: 'Hidráulica',
      VIBRACION: 'Mecánica',
      CORRIENTE: 'Electricidad',
      VOLTAJE: 'Electricidad',
      HUMEDAD: 'HVAC',
    };

    const especialidad = especialidadMap[tipoSensor];

    const tecnicos = await this.prisma.tecnico.findMany({
      where: {
        disponibilidad: 'DISPONIBLE',
        especialidad: { contains: especialidad, mode: 'insensitive' },
      },
      include: {
        orden: {
          where: { estado: { in: ['ASIGNADO', 'EN_PROCESO'] } },
        },
      },
    });

    if (tecnicos.length === 0) {
      // Si no hay técnicos con esa especialidad, buscar cualquiera disponible
      const cualquierTecnico = await this.prisma.tecnico.findFirst({
        where: { disponibilidad: 'DISPONIBLE' },
        include: {
          orden: {
            where: { estado: { in: ['ASIGNADO', 'EN_PROCESO'] } },
          },
        },
      });
      return cualquierTecnico;
    }

    // Ordenar por carga de trabajo (menos órdenes activas = mejor)
    tecnicos.sort((a, b) => a.orden.length - b.orden.length);

    return tecnicos[0];
  }

  // -------------------------------------------------------
  // 📢 NOTIFICAR ADMINISTRADORES
  // -------------------------------------------------------
  private async notificarAdministradores(mensaje: string, orden: any) {
    const admins = await this.prisma.usuario.findMany({
      where: { rol: 'ADMIN' },
    });

    for (const admin of admins) {
      await this.notificacionesService.crear({
        usuarioId: admin.id,
        tipo: 'ALERTA_IOT',
        titulo: '🏭 Alerta IoT - Orden Automática',
        mensaje: `${mensaje}. Orden #${orden.id} creada automáticamente.`,
        ordenId: orden.id,
      });

      // Notificar en tiempo real
      this.notificacionesGateway.notifyUser(admin.id, {
        tipo: 'ALERTA_IOT',
        titulo: '🏭 Alerta IoT',
        mensaje,
        ordenId: orden.id,
      });
    }
  }

  // -------------------------------------------------------
  // 🔍 OBTENER SENSORES (con paginación)
  // -------------------------------------------------------
  async obtenerSensores(
    page: number = 1,
    limit: number = 50,
    tipo?: TipoSensor,
  ) {
    const skip = (page - 1) * limit;
    const where = tipo ? { tipo } : {};

    const [sensores, total] = await Promise.all([
      this.prisma.sensor.findMany({
        where,
        include: {
          lecturas: {
            orderBy: { timestamp: 'desc' },
            take: 20,
          },
          alertas: {
            where: { resuelta: false },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { codigo: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.sensor.count({ where }),
    ]);

    return {
      data: sensores,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async obtenerSensor(id: number) {
    return this.prisma.sensor.findUnique({
      where: { id },
      include: {
        lecturas: {
          orderBy: { timestamp: 'desc' },
          take: 100,
        },
        alertas: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  // -------------------------------------------------------
  // 🚨 OBTENER ALERTAS
  // -------------------------------------------------------
  async obtenerAlertasActivas() {
    return this.prisma.alerta.findMany({
      where: { resuelta: false },
      include: {
        sensor: true,
        orden: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolverAlerta(alertaId: number) {
    return this.prisma.alerta.update({
      where: { id: alertaId },
      data: { resuelta: true },
    });
  }

  // -------------------------------------------------------
  // 🔧 HELPERS
  // -------------------------------------------------------
  private getTipoProblema(tipoSensor: TipoSensor): string {
    const map = {
      TEMPERATURA: 'Problema de temperatura',
      PRESION: 'Problema de presión',
      VIBRACION: 'Vibración anormal',
      CORRIENTE: 'Problema eléctrico - corriente',
      VOLTAJE: 'Problema eléctrico - voltaje',
      HUMEDAD: 'Problema de humedad',
    };
    return map[tipoSensor] || 'Problema detectado por sensor';
  }

  private getEspecialidad(tipoSensor: TipoSensor): string {
    const map = {
      TEMPERATURA: 'HVAC',
      PRESION: 'Hidráulica',
      VIBRACION: 'Mecánica',
      CORRIENTE: 'Electricidad Industrial',
      VOLTAJE: 'Electricidad Industrial',
      HUMEDAD: 'HVAC',
    };
    return map[tipoSensor] || 'General';
  }

  // -------------------------------------------------------
  // ⚙️ ACTUALIZAR SENSOR
  // -------------------------------------------------------
  async actualizarSensor(
    id: number,
    data: {
      umbralMin?: number;
      umbralMax?: number;
      activo?: boolean;
    },
  ) {
    return this.prisma.sensor.update({
      where: { id },
      data,
    });
  }

  // -------------------------------------------------------
  // 📈 OBTENER LECTURAS HISTÓRICAS
  // -------------------------------------------------------
  async obtenerLecturas(
    sensorId: number,
    limit: number = 100,
    fechaDesde?: Date,
    fechaHasta?: Date,
  ) {
    const where: any = { sensorId };

    if (fechaDesde || fechaHasta) {
      where.timestamp = {};
      if (fechaDesde) where.timestamp.gte = fechaDesde;
      if (fechaHasta) where.timestamp.lte = fechaHasta;
    }

    return this.prisma.lectura.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: limit,
    });
  }
}
