import { Controller, Get, Post, Param, UseInterceptors, UploadedFile, Body, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EvidenciasService } from './evidencias.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('evidencias')
export class EvidenciasController {
  constructor(private readonly evidenciasService: EvidenciasService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/evidencias',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        const filename = `evidencia-${uniqueSuffix}${ext}`;
        callback(null, filename);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return callback(new Error('Solo se permiten archivos de imagen'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  async uploadEvidencia(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      ordenId: string;
      userId: string;
      userRole: string;
      userName: string;
    }
  ) {
    if (!file) {
      throw new Error('No se ha subido ningún archivo');
    }

    const evidencia = await this.evidenciasService.create({
      ordenid: parseInt(body.ordenId),
      filename: file.filename, // Usar el nombre generado, no el original
      filepath: file.path,
      mimetype: file.mimetype,
      size: file.size,
      userid: body.userId,
      userrole: body.userRole,
      username: body.userName,
    });

    return {
      message: 'Evidencia subida correctamente',
      evidencia,
    };
  }

  @Get('orden/:ordenId')
  async getEvidenciasByOrden(@Param('ordenId', ParseIntPipe) ordenId: number) {
    return this.evidenciasService.findByOrden(ordenId);
  }

  @Get(':id')
  async getEvidencia(@Param('id', ParseIntPipe) id: number) {
    return this.evidenciasService.findOne(id);
  }
}
