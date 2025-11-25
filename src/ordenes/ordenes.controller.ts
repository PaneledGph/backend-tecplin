import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
  Res,
  BadRequestException,
  ForbiddenException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { OrdenesService } from './ordenes.service';
import { PdfService } from './pdf.service';
import { UploadService } from './upload.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Estado, Prioridad } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActualizarUbicacionTecnicoDto } from './dto/actualizar-ubicacion-tecnico.dto';
import { ActualizarEstadoOrdenDto } from './dto/actualizar-estado-orden.dto';

@Controller('ordenes')
@UseGuards(AuthGuard, RolesGuard)
export class OrdenesController {
  constructor(
    private ordenesService: OrdenesService,
    private prisma: PrismaService,
    private pdfService: PdfService,
    private uploadService: UploadService,
  ) {}

  // Crear nueva orden (CLIENTE o ADMIN)
  @Post('crear')
  @Roles('CLIENTE', 'ADMIN')
  async crearOrden(
    @Req() req,
    @Body()
    body: {
      descripcion: string;
      ubicacion?: string;
      ubicacionLatitud?: number;
      ubicacionLongitud?: number;
      tipoProblema?: string;
      prioridad?: Prioridad;
      clienteId?: number;
      nombreContacto?: string;
      telefonoContacto?: string;
      emailContacto?: string;
      horarioPreferido?: string;
      materialesRequeridos?: string;
      observaciones?: string;
      imagenes?: string[];
      costoEstimado?: number;
      tiempoEstimadoHoras?: number;
    },
  ) {
    const usuarioId = req.user.sub;
    const rol = req.user.rol;

    let clienteIdFinal: number;

    // Si es ADMIN y proporciona clienteId, usar ese
    if (rol === 'ADMIN' && body.clienteId) {
      clienteIdFinal = body.clienteId;
    } else {
      // Si es CLIENTE, buscar su cliente asociado
      const cliente = await this.prisma.cliente.findUnique({
        where: { usuarioId },
      });

      if (!cliente) {
        throw new BadRequestException(
          'El usuario no tiene un cliente asociado.',
        );
      }

      clienteIdFinal = cliente.id;
    }

    // Crear la orden con todos los datos
    return this.ordenesService.crearOrden(
      clienteIdFinal,
      body.descripcion,
      body.prioridad,
      body.ubicacion,
      body.tipoProblema,
      body.ubicacionLatitud,
      body.ubicacionLongitud,
      body.nombreContacto,
      body.telefonoContacto,
      body.emailContacto,
      body.horarioPreferido,
      body.materialesRequeridos,
      body.observaciones,
      body.imagenes,
      body.costoEstimado,
      body.tiempoEstimadoHoras,
    );
  }

  // Estimar precio de una orden sin crearla (para pantallas de creación)
  @Post('estimar-precio')
  @Roles('CLIENTE', 'ADMIN', 'TECNICO')
  estimarPrecio(
    @Body()
    body: {
      tipoProblema?: string;
      prioridad?: Prioridad;
      tiempoEstimadoHoras?: number;
    },
  ) {
    return this.ordenesService.estimarPrecio(
      body.tipoProblema,
      body.prioridad,
      body.tiempoEstimadoHoras,
    );
  }

  @Get('mis-ordenes')
  @Roles('CLIENTE')
  async misOrdenes(@Req() req) {
    const usuarioId = req.user.sub;

    const cliente = await this.prisma.cliente.findUnique({
      where: { usuarioId },
    });

    if (!cliente) {
      throw new BadRequestException('El usuario no tiene un cliente asociado.');
    }

    return this.ordenesService.obtenerOrdenesCliente(cliente.id);
  }

  @Get()
  @Roles('ADMIN', 'TECNICO')
  async todasOrdenes(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('estado') estado?: Estado,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const rol = req.user.rol;

    if (rol === 'TECNICO') {
      const usuarioId = req.user.sub;
      const tecnico = await this.prisma.tecnico.findUnique({
        where: { usuarioid: usuarioId },
      });

      if (!tecnico) {
        throw new BadRequestException(
          'No se encontró un técnico asociado al usuario.',
        );
      }

      return this.ordenesService.obtenerOrdenesTecnico(
        tecnico.id,
        pageNum,
        limitNum,
        estado,
      );
    }

    return this.ordenesService.obtenerTodasOrdenes(pageNum, limitNum, estado);
  }

  @Patch(':id/estado')
  @Roles('ADMIN', 'TECNICO')
  actualizarEstado(
    @Param('id') id: string,
    @Body() body: ActualizarEstadoOrdenDto,
  ) {
    return this.ordenesService.actualizarEstado(Number(id), body.estado);
  }

  @Patch(':id/asignar-tecnico')
  @Roles('ADMIN')
  asignarTecnico(
    @Param('id') id: string,
    @Body('tecnicoId') tecnicoId: number,
  ) {
    return this.ordenesService.asignarTecnico(Number(id), Number(tecnicoId));
  }

  // Técnico inicia una orden
  @Patch(':id/iniciar')
  @Roles('TECNICO')
  iniciarOrden(@Param('id') id: string) {
    return this.ordenesService.actualizarEstado(Number(id), 'EN_PROCESO');
  }

  // Técnico completa una orden
  @Patch(':id/completar')
  @Roles('TECNICO', 'ADMIN')
  completarOrden(@Param('id') id: string) {
    return this.ordenesService.completarOrden(Number(id));
  }

  @Patch(':id/ubicacion-tecnico')
  @Roles('TECNICO')
  async actualizarUbicacionTecnico(
    @Param('id') id: string,
    @Body() body: ActualizarUbicacionTecnicoDto,
    @Req() req,
  ) {
    const usuarioId = req.user.sub;
    const tecnico = await this.prisma.tecnico.findUnique({
      where: { usuarioid: usuarioId },
    });

    if (!tecnico) {
      throw new BadRequestException(
        'No se encontró un técnico asociado al usuario.',
      );
    }

    return this.ordenesService.registrarUbicacionTecnico(
      Number(id),
      tecnico.id,
      body.lat,
      body.lng,
      body.precision,
    );
  }

  @Get(':id/ruta-tecnico')
  @Roles('ADMIN', 'TECNICO')
  obtenerRutaTecnico(@Param('id') id: string) {
    return this.ordenesService.obtenerRutaTecnico(Number(id));
  }

  // Cliente califica el servicio
  @Patch(':id/calificar')
  @Roles('CLIENTE')
  async calificarServicio(
    @Param('id') id: string,
    @Body('calificacion') calificacion: number,
    @Body('comentario') comentario?: string,
  ) {
    return this.ordenesService.calificarServicio(
      Number(id),
      calificacion,
      comentario,
    );
  }

  // Obtener detalle de una orden
  @Get(':id')
  @Roles('ADMIN', 'TECNICO', 'CLIENTE')
  async obtenerOrden(@Param('id') id: string, @Req() req) {
    const ordenId = Number(id);
    const { rol, sub } = req.user;

    if (rol === 'TECNICO') {
      const tecnico = await this.prisma.tecnico.findUnique({
        where: { usuarioid: sub },
      });

      if (!tecnico) {
        throw new BadRequestException(
          'No se encontró un técnico asociado al usuario.',
        );
      }

      const orden = await this.prisma.orden.findUnique({
        where: { id: ordenId },
        select: { tecnicoid: true },
      });

      if (!orden || orden.tecnicoid !== tecnico.id) {
        throw new ForbiddenException(
          'Este técnico no tiene acceso a esta orden de servicio.',
        );
      }
    } else if (rol === 'CLIENTE') {
      const cliente = await this.prisma.cliente.findUnique({
        where: { usuarioId: sub },
      });

      if (!cliente) {
        throw new BadRequestException(
          'El usuario no tiene un cliente asociado.',
        );
      }

      const orden = await this.prisma.orden.findUnique({
        where: { id: ordenId },
        select: { clienteid: true },
      });

      if (!orden || orden.clienteid !== cliente.id) {
        throw new ForbiddenException(
          'Este cliente no tiene acceso a esta orden de servicio.',
        );
      }
    }

    return this.ordenesService.obtenerOrdenPorId(ordenId);
  }

  // Actualizar orden (agregar imágenes, actualizar campos)
  @Patch(':id')
  @Roles('ADMIN', 'TECNICO', 'CLIENTE')
  async actualizarOrden(
    @Param('id') id: string,
    @Body()
    body: {
      descripcion?: string;
      ubicacion?: string;
      ubicacionLatitud?: number;
      ubicacionLongitud?: number;
      tipoProblema?: string;
      nombreContacto?: string;
      telefonoContacto?: string;
      emailContacto?: string;
      horarioPreferido?: string;
      materialesRequeridos?: string;
      observaciones?: string;
      imagenes?: string[];
      costoEstimado?: number;
      costoFinal?: number;
      tiempoEstimadoHoras?: number;
    },
  ) {
    return this.ordenesService.actualizarOrden(Number(id), body);
  }

  // Generar reporte PDF de una orden
  @Get(':id/reporte-pdf')
  @Roles('ADMIN', 'TECNICO', 'CLIENTE')
  async generarReportePDF(@Param('id') id: string, @Res() res: Response) {
    try {
      // Obtener la orden completa con todas las relaciones
      const orden = await this.ordenesService.obtenerOrdenPorId(Number(id));

      if (!orden) {
        return res.status(404).json({ message: 'Orden no encontrada' });
      }

      // Generar el PDF
      const pdfBuffer = await this.pdfService.generarReporteOrden(orden);

      // Configurar headers para descarga
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=orden-${id}-reporte.pdf`,
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      // Enviar el PDF
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generando PDF:', error);
      res.status(500).json({ message: 'Error generando el reporte PDF' });
    }
  }

  // Subir evidencia fotográfica
  @Post(':id/evidencias')
  @Roles('ADMIN', 'TECNICO', 'CLIENTE')
  @UseInterceptors(FileInterceptor('foto'))
  async subirEvidencia(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { userId: string; userRole: string; userName: string },
    @Req() req,
  ) {
    try {
      const evidencia = await this.uploadService.guardarEvidencia(
        Number(id),
        file,
        {
          userId: body.userId || req.user.sub.toString(),
          userRole: body.userRole || req.user.rol,
          userName: body.userName || req.user.usuario,
        },
      );

      return {
        success: true,
        evidencia,
        message: 'Evidencia subida correctamente',
      };
    } catch (error) {
      console.error('Error subiendo evidencia:', error);
      throw new BadRequestException('Error al subir la evidencia');
    }
  }

  // Obtener evidencias de una orden
  @Get(':id/evidencias')
  @Roles('ADMIN', 'TECNICO', 'CLIENTE')
  async obtenerEvidencias(@Param('id') id: string, @Req() req) {
    const ordenId = Number(id);
    const { rol, sub } = req.user;

    if (rol === 'TECNICO') {
      const tecnico = await this.prisma.tecnico.findUnique({
        where: { usuarioid: sub },
      });

      if (!tecnico) {
        throw new BadRequestException(
          'No se encontró un técnico asociado al usuario.',
        );
      }

      const orden = await this.prisma.orden.findUnique({
        where: { id: ordenId },
        select: { tecnicoid: true },
      });

      if (!orden || orden.tecnicoid !== tecnico.id) {
        throw new ForbiddenException(
          'Este técnico no tiene acceso a las evidencias de esta orden.',
        );
      }
    } else if (rol === 'CLIENTE') {
      const cliente = await this.prisma.cliente.findUnique({
        where: { usuarioId: sub },
      });

      if (!cliente) {
        throw new BadRequestException(
          'El usuario no tiene un cliente asociado.',
        );
      }

      const orden = await this.prisma.orden.findUnique({
        where: { id: ordenId },
        select: { clienteid: true },
      });

      if (!orden || orden.clienteid !== cliente.id) {
        throw new ForbiddenException(
          'Este cliente no tiene acceso a las evidencias de esta orden.',
        );
      }
    }

    return this.uploadService.obtenerEvidencias(ordenId);
  }

  // Eliminar evidencia
  @Delete('evidencias/:evidenciaId')
  @Roles('ADMIN', 'TECNICO', 'CLIENTE')
  async eliminarEvidencia(@Param('evidenciaId') evidenciaId: string) {
    return this.uploadService.eliminarEvidencia(Number(evidenciaId));
  }
}
