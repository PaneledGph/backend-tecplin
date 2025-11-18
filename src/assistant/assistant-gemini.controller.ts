import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AssistantEnhancedService } from './assistant-enhanced.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AssistantCommandDto } from './intent-detector.service';

@Controller('assistant')
@UseGuards(AuthGuard, RolesGuard)
export class AssistantGeminiController {
  constructor(
    private readonly assistantEnhanced: AssistantEnhancedService
  ) {}

  /**
   * Endpoint principal para comandos de voz/texto con IA avanzada
   */
  @Post('command')
  async handleCommand(@Req() req, @Body() body: { text: string; activeOrderId?: number }) {
    const text = body.text.toLowerCase();
    try {
      console.log(' Comando recibido:', body);
      console.log(' Usuario:', req.user);
      
      const userId = req.user.sub;
      const userRole = req.user.rol;

      const command: AssistantCommandDto = {
        text: body.text,
        userId: userId,
        role: userRole,
        activeOrderId: body.activeOrderId
      };

      // Validar permisos por rol
      const rolePermissions = this.getRolePermissions(userRole);
      console.log(`👤 Usuario ${userRole} con permisos:`, rolePermissions);

      // Respuesta temporal para testing
      if (!process.env.GEMINI_API_KEY) {
        console.log('⚠️ GEMINI_API_KEY no configurada, usando respuesta de prueba');
        return {
          spokenText: `Recibí tu comando: "${body.text}". El asistente está funcionando pero necesita configurar la API key de Gemini.`,
          confidence: 0.9,
          actions: []
        };
      }

      // Fallback para comandos comunes si Gemini falla
      const text = body.text.toLowerCase();
      if (text.includes('reporte') && text.includes('día')) {
        console.log('🎯 Fallback: Detectado comando de reporte diario');
        return {
          spokenText: 'Abriendo el reporte del día. Aquí tienes las estadísticas actuales del sistema.',
          confidence: 0.9,
          actions: [{ type: 'OPEN_DAILY_REPORT' }]
        };
      }

      const result = await this.assistantEnhanced.handleAdvancedCommand(command);
      
      // Si Gemini no entendió, usar fallback inteligente
      if (result.spokenText?.includes('no entendí') || (result.confidence && result.confidence < 0.5)) {
        // Fallbacks específicos por rol y comando
        if (text.includes('reporte') || text.includes('dashboard') || text.includes('estadística')) {
          return {
            spokenText: 'Te muestro el reporte del día con las estadísticas actuales.',
            confidence: 0.8,
            actions: [{ type: 'OPEN_DAILY_REPORT' }]
          };
        }
        
        if (text.includes('mis órdenes') || text.includes('órdenes asignadas')) {
          return {
            spokenText: 'Te muestro tus órdenes asignadas.',
            confidence: 0.8,
            actions: [{ type: 'SHOW_MY_ORDERS' }]
          };
        }

        if (text.includes('diagnosticar') || text.includes('problema técnico')) {
          return {
            spokenText: 'Te ayudo con el diagnóstico técnico. ¿Qué tipo de problema estás enfrentando?',
            confidence: 0.8,
            actions: [{ type: 'TECH_HELP' }]
          };
        }
      }

      return result;
    } catch (error) {
      console.error('❌ Error en handleCommand:', error);
      
      // Fallback cuando Gemini está completamente caído
      if (text.includes('mis órdenes') || text.includes('órdenes asignadas')) {
        return {
          spokenText: 'Te muestro tus órdenes asignadas.',
          confidence: 0.7,
          actions: [{ type: 'SHOW_MY_ORDERS' }]
        };
      }

      if (text.includes('diagnosticar') || text.includes('problema técnico') || text.includes('ayuda técnica')) {
        return {
          spokenText: 'Te ayudo con el diagnóstico técnico. Describe el problema que estás enfrentando.',
          confidence: 0.7,
          actions: [{ type: 'TECH_HELP' }]
        };
      }

      if (text.includes('reporte') || text.includes('estadística')) {
        return {
          spokenText: 'Te muestro el reporte del día con las estadísticas actuales.',
          confidence: 0.7,
          actions: [{ type: 'OPEN_DAILY_REPORT' }]
        };
      }

      return {
        spokenText: 'El asistente está temporalmente fuera de servicio. Intenta usar los botones de la pantalla.',
        error: error.message,
        confidence: 0.1
      };
    }
  }

  /**
   * Obtiene los permisos de comandos según el rol del usuario
   */
  private getRolePermissions(role: string): string[] {
    const permissions = {
      'ADMIN': [
        'GET_DAILY_REPORT', 'GET_TECHNICIAN_PERFORMANCE', 'ASSIGN_TECHNICIAN',
        'CREATE_ORDER', 'CANCEL_ORDER', 'UPDATE_ORDER_STATUS',
        'GET_ORDER_STATUS', 'GET_CLIENT_ORDERS', 'RESCHEDULE_ORDER',
        'GET_INVENTORY_ITEM', 'REQUEST_MATERIAL'
      ],
      'TECNICO': [
        'UPDATE_ORDER_STATUS', 'SHOW_ROUTE', 'GET_TECHNICIAN_LOCATION',
        'REGISTER_EVIDENCE', 'GET_ORDER_STATUS', 'TECH_DIAGNOSIS',
        'REQUEST_MATERIAL', 'GET_CLIENT_ORDERS'
      ],
      'CLIENTE': [
        'CREATE_ORDER', 'GET_ORDER_STATUS', 'RESCHEDULE_ORDER',
        'CANCEL_ORDER', 'GET_CLIENT_ORDERS'
      ]
    };

    return permissions[role] || [];
  }

  /**
   * Valida si un intent está permitido para el rol del usuario
   */
  private isIntentAllowed(intent: string, userRole: string): boolean {
    const allowedIntents = this.getRolePermissions(userRole);
    return allowedIntents.includes(intent);
  }

  /**
   * Endpoint específico para consultas técnicas (RAG)
   */
  @Post('technical-query')
  async technicalQuery(@Req() req, @Body() body: { query: string }) {
    const userId = req.user.sub;
    const userRole = req.user.rol;

    const command: AssistantCommandDto = {
      text: body.query,
      userId: userId,
      role: userRole
    };

    // Forzar intent técnico
    const response = await this.assistantEnhanced.handleAdvancedCommand({
      ...command,
      text: `diagnóstico técnico: ${body.query}`
    });

    return response;
  }

  /**
   * Endpoint para comandos rápidos predefinidos
   */
  @Post('quick-action')
  async quickAction(
    @Req() req, 
    @Body() body: { 
      action: 'ARRIVE' | 'START_WORK' | 'COMPLETE' | 'SHOW_ROUTE';
      orderId?: number;
    }
  ) {
    const userId = req.user.sub;
    const userRole = req.user.rol;

    const actionTexts = {
      'ARRIVE': 'ya llegué',
      'START_WORK': 'iniciar trabajo',
      'COMPLETE': 'terminé el trabajo',
      'SHOW_ROUTE': 'muéstrame la ruta'
    };

    const command: AssistantCommandDto = {
      text: actionTexts[body.action],
      userId: userId,
      role: userRole,
      activeOrderId: body.orderId
    };

    return this.assistantEnhanced.handleAdvancedCommand(command);
  }
}
