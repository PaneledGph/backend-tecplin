import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ConversationContext {
  userId: number;
  sessionId: string;
  currentFlow?: string;
  step: number;
  data: any;
  timestamp: Date;
}

export interface FlowStep {
  id: string;
  message: string;
  expectedInputType: 'text' | 'selection' | 'confirmation';
  options?: string[];
  nextStep?: string;
  action?: string;
}

@Injectable()
export class ConversationFlowService {
  private activeConversations = new Map<string, ConversationContext>();

  constructor(private prisma: PrismaService) {}

  /**
   * Flujos de conversación predefinidos
   */
  private flows = {
    CREATE_ORDER: {
      steps: {
        'ask_problem': {
          id: 'ask_problem',
          message: '¿Cuál es el problema que necesitas resolver?',
          expectedInputType: 'text',
          nextStep: 'ask_location'
        },
        'ask_location': {
          id: 'ask_location',
          message: '¿En qué ubicación se encuentra el problema?',
          expectedInputType: 'text',
          nextStep: 'ask_priority'
        },
        'ask_priority': {
          id: 'ask_priority',
          message: '¿Qué prioridad tiene este problema?',
          expectedInputType: 'selection',
          options: ['Alta', 'Media', 'Baja'],
          nextStep: 'create_order'
        },
        'create_order': {
          id: 'create_order',
          message: 'Creando orden de trabajo...',
          expectedInputType: 'confirmation',
          action: 'EXECUTE_CREATE_ORDER'
        }
      }
    },
    UPDATE_ORDER_STATUS: {
      steps: {
        'ask_order_id': {
          id: 'ask_order_id',
          message: '¿Qué orden quieres actualizar? Dime el número de orden.',
          expectedInputType: 'text',
          nextStep: 'ask_new_status'
        },
        'ask_new_status': {
          id: 'ask_new_status',
          message: '¿A qué estado quieres cambiar la orden?',
          expectedInputType: 'selection',
          options: ['En proceso', 'Completado', 'Cancelado', 'Pausado'],
          nextStep: 'update_status'
        },
        'update_status': {
          id: 'update_status',
          message: 'Actualizando estado de la orden...',
          expectedInputType: 'confirmation',
          action: 'EXECUTE_UPDATE_STATUS'
        }
      }
    }
  };

  /**
   * Inicia un nuevo flujo de conversación
   */
  startFlow(userId: number, flowType: string, initialData?: any): ConversationContext {
    const sessionId = `${userId}_${Date.now()}`;
    const context: ConversationContext = {
      userId,
      sessionId,
      currentFlow: flowType,
      step: 0,
      data: initialData || {},
      timestamp: new Date()
    };

    this.activeConversations.set(sessionId, context);
    return context;
  }

  /**
   * Procesa la siguiente entrada del usuario en el flujo
   */
  processFlowInput(sessionId: string, userInput: string): {
    message: string;
    isComplete: boolean;
    nextStep?: FlowStep;
    action?: string;
    data?: any;
  } {
    const context = this.activeConversations.get(sessionId);
    if (!context || !context.currentFlow) {
      return {
        message: 'No hay una conversación activa. ¿En qué puedo ayudarte?',
        isComplete: true
      };
    }

    const flow = this.flows[context.currentFlow];
    if (!flow) {
      return {
        message: 'Flujo no encontrado. Empecemos de nuevo.',
        isComplete: true
      };
    }

    const stepKeys = Object.keys(flow.steps);
    const currentStepKey = stepKeys[context.step];
    const currentStep = flow.steps[currentStepKey];

    if (!currentStep) {
      return {
        message: 'Conversación completada.',
        isComplete: true
      };
    }

    // Si es la primera llamada (userInput vacío), solo mostrar el mensaje del paso actual
    if (userInput === '' && context.step === 0) {
      return {
        message: currentStep.message,
        isComplete: false,
        nextStep: currentStep,
        data: context.data
      };
    }

    // Guardar la entrada del usuario
    context.data[currentStep.id] = userInput;

    // Determinar el siguiente paso
    let nextStepKey = currentStep.nextStep;
    
    // Lógica especial para ciertos flujos
    context.step++;
    const nextStep = nextStepKey ? flow.steps[nextStepKey] : null;

    console.log('📋 Siguiente paso:', nextStepKey, 'Existe:', !!nextStep);
    console.log('📋 Paso actual tiene acción:', currentStep.action);

    if (nextStep) {
      this.activeConversations.set(sessionId, context);
      return {
        message: nextStep.message,
        isComplete: false,
        nextStep: nextStep,
        data: context.data
      };
    } else {
      // Flujo completado - ejecutar acción si existe
      this.activeConversations.delete(sessionId);
      
      if (currentStep.action) {
        console.log('✅ Flujo completado, ejecutando acción:', currentStep.action);
        return {
          message: currentStep.message,
          isComplete: true,
          action: currentStep.action,
          data: context.data
        };
      } else {
        return {
          message: 'Conversación completada.',
          isComplete: true,
          data: context.data
        };
      }
    }
  }

  /**
   * Obtiene el contexto de conversación activa
   */
  getActiveConversation(userId: number): ConversationContext | null {
    for (const [sessionId, context] of this.activeConversations.entries()) {
      if (context.userId === userId) {
        return context;
      }
    }
    return null;
  }

  private normalizeNumberWords(text: string): string {
    if (!text) return '';

    const replacements: Record<string, string> = {
      'cero': '0',
      'uno': '1',
      'una': '1',
      'un': '1',
      'dos': '2',
      'tres': '3',
      'cuatro': '4',
      'cinco': '5',
      'seis': '6',
      'siete': '7',
      'ocho': '8',
      'nueve': '9',
      'diez': '10',
      'once': '11',
      'doce': '12',
      'trece': '13',
      'catorce': '14',
      'quince': '15',
      'dieciseis': '16',
      'dieciséis': '16',
      'diecisiete': '17',
      'dieciocho': '18',
      'diecinueve': '19',
      'veinte': '20'
    };

    let normalized = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    Object.entries(replacements).forEach(([word, digit]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      normalized = normalized.replace(regex, digit);
    });

    return normalized;
  }

  private hasTechnicianName(text: string): boolean {
    if (!text) return false;
    const pattern = /(?:a|al)\s+(?:tecnico|tecnica)\s+[a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?/i;
    return pattern.test(text);
  }

  /**
   * Cancela una conversación activa
   */
  cancelConversation(sessionId: string): boolean {
    return this.activeConversations.delete(sessionId);
  }

  /**
   * Detecta si el input del usuario requiere iniciar un flujo
   */
  detectFlowIntent(userInput: string): string | null {
    const input = userInput.toLowerCase();
    const normalizedNumbers = this.normalizeNumberWords(userInput);
    const sanitized = userInput
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    console.log('🔍 Detectando flow intent para:', input);

    if ((input.includes('asigna') || input.includes('asignar')) && (input.includes('técnico') || input.includes('tecnico'))) {
      const hasOrder = /\b(orden|order)\s*\d+\b/.test(normalizedNumbers) || /\b\d+\b/.test(normalizedNumbers);
      const hasTechnicianReference = this.hasTechnicianName(sanitized);

      if (hasOrder && hasTechnicianReference) {
        console.log('🚀 Comando con orden y técnico detectado, usando asignación directa');
        return 'DIRECT_ASSIGNMENT';
      }

      console.log('⚠️ Comando de asignación sin orden o técnico válido, ignorando flujo');
      return null;
    }

    if (input.includes('crear') && input.includes('orden')) {
      console.log('✅ Detectado: CREATE_ORDER');
      return 'CREATE_ORDER';
    }

    if ((input.includes('actualizar') || input.includes('cambiar')) && 
        (input.includes('estado') || input.includes('status'))) {
      console.log('✅ Detectado: UPDATE_ORDER_STATUS');
      return 'UPDATE_ORDER_STATUS';
    }

    if (input.includes('completar') || input.includes('terminar') || input.includes('finalizar')) {
      console.log('✅ Detectado: UPDATE_ORDER_STATUS (completar)');
      return 'UPDATE_ORDER_STATUS';
    }

    console.log('❌ No se detectó ningún flow intent');
    return null;
  }

  /**
   * Limpia conversaciones expiradas (más de 30 minutos)
   */
  cleanExpiredConversations(): void {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    for (const [sessionId, context] of this.activeConversations.entries()) {
      if (context.timestamp < thirtyMinutesAgo) {
        this.activeConversations.delete(sessionId);
      }
    }
  }
}
