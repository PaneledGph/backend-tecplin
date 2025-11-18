import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configuración del transporter
    // Para desarrollo, usa Ethereal (emails de prueba)
    // Para producción, usa Gmail, SendGrid, etc.
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
      // Configuración personalizada (producción)
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else {
      // Ethereal para desarrollo (emails de prueba)
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('📧 Email configurado con Ethereal (desarrollo)');
      console.log(`   Usuario: ${testAccount.user}`);
    }
  }

  // -------------------------------------------------------
  // 📧 ENVIAR EMAIL GENÉRICO
  // -------------------------------------------------------
  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"TECPLIN" <noreply@tecplin.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      console.log(`📧 Email enviado a ${options.to}`);
      console.log(`   Preview: ${nodemailer.getTestMessageUrl(info)}`);

      return info;
    } catch (error) {
      console.error('❌ Error al enviar email:', error);
      throw error;
    }
  }

  // -------------------------------------------------------
  // 📬 NOTIFICACIÓN DE ORDEN CREADA
  // -------------------------------------------------------
  async notificarOrdenCreada(email: string, orden: any) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563EB; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .orden-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .orden-info p { margin: 10px 0; }
          .label { font-weight: bold; color: #2563EB; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 30px; background: #2563EB; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔧 Nueva Orden de Servicio</h1>
          </div>
          <div class="content">
            <p>Se ha creado una nueva orden de servicio:</p>
            
            <div class="orden-info">
              <p><span class="label">Orden #:</span> ${orden.id}</p>
              <p><span class="label">Descripción:</span> ${orden.descripcion}</p>
              <p><span class="label">Prioridad:</span> ${orden.prioridad}</p>
              <p><span class="label">Estado:</span> ${orden.estado}</p>
              ${orden.ubicacion ? `<p><span class="label">Ubicación:</span> ${orden.ubicacion}</p>` : ''}
              ${orden.tipoProblema ? `<p><span class="label">Tipo:</span> ${orden.tipoProblema}</p>` : ''}
            </div>

            <p>Puedes ver más detalles en el sistema TECPLIN.</p>
            
            <div class="footer">
              <p>Este es un email automático de TECPLIN</p>
              <p>Por favor no respondas a este mensaje</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `🔧 Nueva Orden #${orden.id} - ${orden.prioridad}`,
      html,
      text: `Nueva orden de servicio #${orden.id}: ${orden.descripcion}`,
    });
  }

  // -------------------------------------------------------
  // 👨‍🔧 NOTIFICACIÓN DE ASIGNACIÓN A TÉCNICO
  // -------------------------------------------------------
  async notificarAsignacionTecnico(email: string, orden: any, tecnico: any) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .orden-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .orden-info p { margin: 10px 0; }
          .label { font-weight: bold; color: #10B981; }
          .urgente { background: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👨‍🔧 Nueva Orden Asignada</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${tecnico.nombre}</strong>,</p>
            <p>Se te ha asignado una nueva orden de servicio:</p>
            
            ${orden.prioridad === 'ALTA' ? '<div class="urgente">⚠️ <strong>PRIORIDAD ALTA</strong> - Requiere atención inmediata</div>' : ''}
            
            <div class="orden-info">
              <p><span class="label">Orden #:</span> ${orden.id}</p>
              <p><span class="label">Descripción:</span> ${orden.descripcion}</p>
              <p><span class="label">Prioridad:</span> ${orden.prioridad}</p>
              ${orden.ubicacion ? `<p><span class="label">Ubicación:</span> ${orden.ubicacion}</p>` : ''}
              ${orden.tipoProblema ? `<p><span class="label">Tipo:</span> ${orden.tipoProblema}</p>` : ''}
              ${orden.especialidadRequerida ? `<p><span class="label">Especialidad:</span> ${orden.especialidadRequerida}</p>` : ''}
            </div>

            <p>Por favor, revisa los detalles en el sistema y actualiza el estado cuando comiences a trabajar.</p>
            
            <div class="footer">
              <p>Este es un email automático de TECPLIN</p>
              <p>Por favor no respondas a este mensaje</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `👨‍🔧 Orden #${orden.id} Asignada - ${orden.prioridad}`,
      html,
      text: `Se te ha asignado la orden #${orden.id}: ${orden.descripcion}`,
    });
  }

  // -------------------------------------------------------
  // 🚨 NOTIFICACIÓN DE ALERTA IoT
  // -------------------------------------------------------
  async notificarAlertaIoT(email: string, alerta: any, orden: any) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .alerta-box { background: #FEE2E2; border: 2px solid #EF4444; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .orden-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .orden-info p { margin: 10px 0; }
          .label { font-weight: bold; color: #EF4444; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Alerta IoT Detectada</h1>
          </div>
          <div class="content">
            <div class="alerta-box">
              <h2 style="margin-top: 0; color: #EF4444;">⚠️ ${alerta.tipo}</h2>
              <p><strong>Mensaje:</strong> ${alerta.mensaje}</p>
              <p><strong>Valor:</strong> ${alerta.valor}</p>
              <p><strong>Sensor:</strong> ${alerta.sensor?.codigo || 'N/A'}</p>
            </div>

            <p>Se ha creado automáticamente una orden de servicio:</p>
            
            <div class="orden-info">
              <p><span class="label">Orden #:</span> ${orden.id}</p>
              <p><span class="label">Descripción:</span> ${orden.descripcion}</p>
              <p><span class="label">Estado:</span> ${orden.estado}</p>
              ${orden.tecnico ? `<p><span class="label">Técnico asignado:</span> ${orden.tecnico.nombre}</p>` : ''}
            </div>

            <p>Revisa el dashboard IoT para más detalles.</p>
            
            <div class="footer">
              <p>Este es un email automático de TECPLIN</p>
              <p>Por favor no respondas a este mensaje</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `🚨 Alerta IoT - ${alerta.sensor?.codigo || 'Sensor'}`,
      html,
      text: `Alerta IoT: ${alerta.mensaje}. Orden #${orden.id} creada.`,
    });
  }

  // -------------------------------------------------------
  // ✅ NOTIFICACIÓN DE ORDEN COMPLETADA
  // -------------------------------------------------------
  async notificarOrdenCompletada(email: string, orden: any) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .success-box { background: #D1FAE5; border: 2px solid #10B981; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .orden-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .orden-info p { margin: 10px 0; }
          .label { font-weight: bold; color: #10B981; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Orden Completada</h1>
          </div>
          <div class="content">
            <div class="success-box">
              <h2 style="margin-top: 0; color: #10B981;">🎉 ¡Trabajo Completado!</h2>
              <p>La orden de servicio ha sido completada exitosamente.</p>
            </div>
            
            <div class="orden-info">
              <p><span class="label">Orden #:</span> ${orden.id}</p>
              <p><span class="label">Descripción:</span> ${orden.descripcion}</p>
              ${orden.tecnico ? `<p><span class="label">Técnico:</span> ${orden.tecnico.nombre}</p>` : ''}
            </div>

            <p>Gracias por confiar en TECPLIN.</p>
            
            <div class="footer">
              <p>Este es un email automático de TECPLIN</p>
              <p>Por favor no respondas a este mensaje</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `✅ Orden #${orden.id} Completada`,
      html,
      text: `La orden #${orden.id} ha sido completada.`,
    });
  }
}
