import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import * as fs from 'fs';

@Injectable()
export class PdfService {
  async generarReporteOrden(orden: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
        const chunks: Buffer[] = [];

        // Capturar el PDF en memoria
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // ========== ENCABEZADO ==========
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor('#1F2937')
          .text('REPORTE DE ORDEN DE SERVICIO', { align: 'center' });

        doc.moveDown(0.5);
        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor('#6B7280')
          .text(`Orden #${orden.id}`, { align: 'center' });

        doc.moveDown(1);
        doc
          .moveTo(50, doc.y)
          .lineTo(562, doc.y)
          .strokeColor('#E5E7EB')
          .stroke();

        doc.moveDown(1);

        // ========== INFORMACIÓN GENERAL ==========
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('📋 Información General');

        doc.moveDown(0.5);

        const infoGeneral = [
          ['Estado:', orden.estado],
          ['Prioridad:', orden.prioridad],
          ['Fecha de Solicitud:', new Date(orden.fechasolicitud).toLocaleString('es-ES')],
          ['Fecha de Completado:', orden.fechaCompletado ? new Date(orden.fechaCompletado).toLocaleString('es-ES') : 'N/A'],
        ];

        this.drawTable(doc, infoGeneral);
        doc.moveDown(1);

        // ========== DESCRIPCIÓN ==========
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('📝 Descripción del Problema');

        doc.moveDown(0.5);
        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#374151')
          .text(orden.descripcion || 'N/A', { align: 'justify' });

        doc.moveDown(1);

        // ========== CLIENTE ==========
        if (orden.cliente) {
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text('👤 Información del Cliente');

          doc.moveDown(0.5);

          const infoCliente = [
            ['Nombre:', orden.cliente.nombre || 'N/A'],
            ['Email:', orden.cliente.email || 'N/A'],
            ['Teléfono:', orden.cliente.telefono || 'N/A'],
          ];

          // Agregar info de contacto adicional si existe
          if (orden.nombreContacto) {
            infoCliente.push(['Contacto Adicional:', orden.nombreContacto]);
          }
          if (orden.telefonoContacto) {
            infoCliente.push(['Teléfono Contacto:', orden.telefonoContacto]);
          }
          if (orden.emailContacto) {
            infoCliente.push(['Email Contacto:', orden.emailContacto]);
          }

          this.drawTable(doc, infoCliente);
          doc.moveDown(1);
        }

        // ========== TÉCNICO ==========
        if (orden.tecnico) {
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text('🔧 Técnico Asignado');

          doc.moveDown(0.5);

          const infoTecnico = [
            ['Nombre:', orden.tecnico.nombre || 'N/A'],
            ['Especialidad:', orden.tecnico.especialidad || 'N/A'],
          ];

          this.drawTable(doc, infoTecnico);
          doc.moveDown(1);
        }

        // ========== UBICACIÓN ==========
        if (orden.ubicacion) {
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text('📍 Ubicación');

          doc.moveDown(0.5);

          const infoUbicacion = [
            ['Dirección:', orden.ubicacion],
          ];

          if (orden.ubicacionLatitud && orden.ubicacionLongitud) {
            infoUbicacion.push([
              'Coordenadas:',
              `${orden.ubicacionLatitud}, ${orden.ubicacionLongitud}`,
            ]);
          }

          this.drawTable(doc, infoUbicacion);
          doc.moveDown(1);
        }

        // ========== DETALLES DEL SERVICIO ==========
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('🔧 Detalles del Servicio');

        doc.moveDown(0.5);

        const detallesServicio: string[][] = [];

        if (orden.tipoProblema) {
          detallesServicio.push(['Tipo de Problema:', orden.tipoProblema]);
        }
        if (orden.especialidadRequerida) {
          detallesServicio.push(['Especialidad Requerida:', orden.especialidadRequerida]);
        }
        if (orden.horarioPreferido) {
          detallesServicio.push(['Horario Preferido:', orden.horarioPreferido]);
        }
        if (orden.materialesRequeridos) {
          detallesServicio.push(['Materiales Requeridos:', orden.materialesRequeridos]);
        }

        if (detallesServicio.length > 0) {
          this.drawTable(doc, detallesServicio);
          doc.moveDown(1);
        }

        // ========== OBSERVACIONES ==========
        if (orden.observaciones) {
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text('📝 Observaciones');

          doc.moveDown(0.5);
          doc
            .fontSize(11)
            .font('Helvetica')
            .fillColor('#374151')
            .text(orden.observaciones, { align: 'justify' });

          doc.moveDown(1);
        }

        // ========== COSTOS Y TIEMPOS ==========
        const costosYTiempos: string[][] = [];

        if (orden.costoEstimado) {
          costosYTiempos.push(['Costo Estimado:', `$${orden.costoEstimado.toFixed(2)}`]);
        }
        if (orden.costoFinal) {
          costosYTiempos.push(['Costo Final:', `$${orden.costoFinal.toFixed(2)}`]);
        }
        if (orden.tiempoEstimadoHoras) {
          costosYTiempos.push(['Tiempo Estimado:', `${orden.tiempoEstimadoHoras} horas`]);
        }

        if (costosYTiempos.length > 0) {
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text('💰 Costos y Tiempos');

          doc.moveDown(0.5);
          this.drawTable(doc, costosYTiempos);
          doc.moveDown(1);
        }

        // ========== EVIDENCIAS ==========
        if (orden.evidencias && orden.evidencias.length > 0) {
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text('📸 Evidencias Fotográficas');

          doc.moveDown(0.5);

          doc
            .fontSize(11)
            .font('Helvetica')
            .fillColor('#374151')
            .text(`Se registraron ${orden.evidencias.length} fotografías como evidencia del servicio.`);

          doc.moveDown(1);

          // Agregar imágenes al PDF
          let imagenesAgregadas = 0;
          const maxImagenesPorPagina = 2;

          for (const evidencia of orden.evidencias) {
            try {
              // Verificar si el archivo existe
              if (fs.existsSync(evidencia.filepath)) {
                // Si ya agregamos 2 imágenes, crear nueva página
                if (imagenesAgregadas > 0 && imagenesAgregadas % maxImagenesPorPagina === 0) {
                  doc.addPage();
                }

                // Información de la evidencia
                const fecha = new Date(evidencia.timestamp).toLocaleString('es-ES');
                const usuario = evidencia.username || 'Usuario no especificado';
                const rol = evidencia.userrole === 'cliente' ? '👤 Cliente' : '🔧 Técnico';

                doc
                  .fontSize(10)
                  .font('Helvetica-Bold')
                  .fillColor('#374151')
                  .text(`${rol} - ${usuario}`);

                doc
                  .fontSize(9)
                  .font('Helvetica')
                  .fillColor('#6B7280')
                  .text(fecha);

                doc.moveDown(0.3);

                // Agregar imagen
                const imageWidth = 450;
                const imageHeight = 300;
                
                doc.image(evidencia.filepath, {
                  fit: [imageWidth, imageHeight],
                  align: 'center',
                });

                doc.moveDown(1);
                imagenesAgregadas++;
              }
            } catch (error) {
              console.error(`Error agregando imagen ${evidencia.filename}:`, error);
              // Continuar con la siguiente imagen
            }
          }

          // Si agregamos imágenes, agregar una nueva página para el resto del contenido
          if (imagenesAgregadas > 0) {
            doc.addPage();
          }
        }

        // ========== CALIFICACIÓN ==========
        if (orden.calificacion) {
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text('⭐ Calificación del Servicio');

          doc.moveDown(0.5);

          const estrellas = '⭐'.repeat(orden.calificacion) + '☆'.repeat(5 - orden.calificacion);

          doc
            .fontSize(20)
            .fillColor('#F59E0B')
            .text(estrellas);

          if (orden.comentarioCalificacion) {
            doc.moveDown(0.5);
            doc
              .fontSize(11)
              .font('Helvetica-Oblique')
              .fillColor('#374151')
              .text(`"${orden.comentarioCalificacion}"`, { align: 'justify' });
          }

          doc.moveDown(1);
        }

        // ========== PIE DE PÁGINA ==========
        const bottomY = doc.page.height - 100;
        doc
          .moveTo(50, bottomY)
          .lineTo(562, bottomY)
          .strokeColor('#E5E7EB')
          .stroke();

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#9CA3AF')
          .text(
            `Reporte generado el ${new Date().toLocaleString('es-ES')}`,
            50,
            bottomY + 10,
            { align: 'center' }
          );

        doc
          .fontSize(8)
          .text('Sistema de Gestión de Órdenes de Servicio - TecPlin', {
            align: 'center',
          });

        // Finalizar el documento
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private drawTable(doc: PDFKit.PDFDocument, data: string[][]) {
    const startY = doc.y;
    const leftMargin = 70;
    const labelWidth = 180;
    const valueX = leftMargin + labelWidth + 10;

    data.forEach(([label, value], index) => {
      const y = startY + index * 20;

      // Label
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#6B7280')
        .text(label, leftMargin, y, { width: labelWidth, continued: false });

      // Value
      doc
        .font('Helvetica')
        .fillColor('#1F2937')
        .text(value || 'N/A', valueX, y, { width: 300 });
    });

    doc.y = startY + data.length * 20;
  }
}
