import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdenesService } from 'src/ordenes/ordenes.service';
import { Prioridad } from '@prisma/client';
import {
  IntentDetectorService,
  AssistantCommandDto,
  DetectedIntent,
} from './intent-detector.service';
import { RAGService, RAGResponse } from './rag.service';
import { AssistantService } from './assistant.service';
import {
  ConversationFlowService,
  ConversationContext,
} from './conversation-flow.service';
import {
  TechnicianAssignmentService,
  AssignmentResult,
} from './technician-assignment.service';
import { NotificacionesService } from 'src/notificaciones/notificaciones.service';

export interface AssistantResponse {
  spokenText: string;
  actions?: AssistantAction[];
  data?: any;
  confidence?: number;
  usedRAG?: boolean;
  isConversationFlow?: boolean;
  conversationSessionId?: string;
}

export interface AssistantAction {
  type: string;
  payload?: any;
}

@Injectable()
export class AssistantEnhancedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly intentDetector: IntentDetectorService,
    private readonly rag: RAGService,
    private readonly assistantService: AssistantService, // Tu servicio existente
    private readonly conversationFlow: ConversationFlowService,
    private readonly technicianAssignment: TechnicianAssignmentService,
    private readonly notificacionesService: NotificacionesService,
    private readonly ordenesService: OrdenesService,
  ) {}

  /**
   * Procesa comando usando IA avanzada (Gemini + RAG + Conversaciones)
   */
  async handleAdvancedCommand(
    dto: AssistantCommandDto,
  ): Promise<AssistantResponse> {
    try {
      console.log('🤖 AssistantEnhanced - Comando recibido:', dto);

      const directAssignment = await this.tryDirectAssignment(dto);
      if (directAssignment) {
        console.log('⚡️ Asignación directa detectada antes de flujos/IA');
        return directAssignment;
      }

      // Atajo directo para abrir evidencias de una orden (especialmente para técnicos)
      const evidenceShortcut = await this.tryEvidenceShortcut(dto);
      if (evidenceShortcut) {
        console.log('⚡️ Atajo de evidencias detectado, abriendo evidencias');
        return evidenceShortcut;
      }

      // 1. Verificar si hay una conversación activa
      const activeConversation = this.conversationFlow.getActiveConversation(
        dto.userId,
      );
      console.log('💬 Conversación activa:', activeConversation ? 'SÍ' : 'NO');

      if (activeConversation) {
        console.log('💬 Procesando conversación activa...');
        return this.handleConversationFlow(dto, activeConversation);
      }

      // 2. Detectar si el comando requiere iniciar un flujo de conversación
      const flowIntent = this.conversationFlow.detectFlowIntent(dto.text);
      console.log('🔍 Flow intent detectado:', flowIntent);

      if (flowIntent === 'DIRECT_ASSIGNMENT') {
        console.log('🚀 Ejecutando asignación directa...');
        return this.executeDirectAssignment(dto);
      }

      if (flowIntent) {
        console.log('🚀 Iniciando flujo de conversación:', flowIntent);
        return this.startConversationFlow(dto, flowIntent);
      }

      // 3. Small talk sencillo sin llamar a Gemini (saludos, hora, etc.)
      const smallTalk = this.handleSmallTalk(dto);
      if (smallTalk) {
        return smallTalk;
      }

      // 4. Detectar intención con Gemini
      const detected = await this.intentDetector.detect(dto);

      // 4. Si es consulta técnica, usar RAG
      if (detected.intent === 'TECH_DIAGNOSIS') {
        return this.handleTechnicalQuery(dto, detected);
      }

      // 5. Ejecutar intenciones múltiples
      const intents = [detected, ...(detected.extraIntents || [])];
      const responses: string[] = [];
      const allActions: AssistantAction[] = [];
      const allData: any = {};

      for (const intent of intents) {
        const response = await this.executeIntent(dto, intent);
        if (response.spokenText) responses.push(response.spokenText);
        if (response.actions) allActions.push(...response.actions);
        if (response.data) Object.assign(allData, response.data);
      }

      return {
        spokenText: responses.join(' '),
        actions: allActions,
        data: allData,
        confidence: detected.confidence,
      };
    } catch (error) {
      console.error('Error en comando avanzado:', error);

      // Fallback al sistema original
      const fallbackResponse = await this.assistantService.procesarMensaje(
        dto.userId,
        dto.text,
      );

      return {
        spokenText:
          fallbackResponse.respuesta || 'No pude procesar tu comando.',
        confidence: 0.3,
      };
    }
  }

  /**
   * Atajo para que el técnico abra directamente las evidencias de una orden
   * con un solo comando de voz ("abrir evidencias de la orden 15", etc.).
   */
  private async tryEvidenceShortcut(
    dto: AssistantCommandDto,
  ): Promise<AssistantResponse | null> {
    // Solo tiene sentido para técnicos (el cliente ya tiene flujo guiado)
    if (dto.role !== 'TECNICO') {
      return null;
    }

    const text = dto.text?.toLowerCase() || '';

    const mentionsEvidence =
      text.includes('evidencia') ||
      text.includes('evidencias') ||
      text.includes('foto') ||
      text.includes('fotos');

    if (!mentionsEvidence) {
      return null;
    }

    const orderId = this.extractOrderId(dto.text) || dto.activeOrderId;
    if (!orderId) {
      return null;
    }

    console.log('🎯 Atajo de evidencias detectado para orden:', orderId);

    // Reusar la lógica de executeShowEvidences pasando el número de orden
    return this.executeShowEvidences(dto, {
      ask_order_id: `orden ${orderId}`,
    });
  }

  /**
   * Maneja interacciones sencillas tipo "hola" o "qué hora es" sin llamar a Gemini.
   */
  private handleSmallTalk(dto: AssistantCommandDto): AssistantResponse | null {
    const text = dto.text?.toLowerCase().trim() || '';
    if (!text) {
      return null;
    }

    // Saludos básicos
    const greetingKeywords = [
      'hola',
      'buenas',
      'buenos dias',
      'buenos días',
      'buenas tardes',
      'buenas noches',
      'hey',
    ];

    if (greetingKeywords.some((k) => text === k || text.startsWith(k + ' '))) {
      return {
        spokenText:
          'Hola, soy el asistente virtual de TECPLIN. ¿En qué puedo ayudarte con tus órdenes de servicio?',
        confidence: 0.95,
      };
    }

    // Preguntar la hora
    if (
      text.includes('que hora es') ||
      text.includes('qué hora es') ||
      text.includes('dime la hora') ||
      text.includes('me dices la hora') ||
      text.includes('me puedes decir la hora')
    ) {
      const now = new Date();
      const timeString = now.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        spokenText: `Son las ${timeString}.`,
        confidence: 0.95,
      };
    }

    return null;
  }

  private async tryDirectAssignment(
    dto: AssistantCommandDto,
  ): Promise<AssistantResponse | null> {
    if (dto.role !== 'ADMIN') {
      return null;
    }

    const command = dto.text?.toLowerCase() || '';
    const mentionsAssignment =
      command.includes('asigna') ||
      command.includes('asignar') ||
      command.includes('asignación') ||
      command.includes('asignacion');
    const mentionsTechnician =
      command.includes('técnico') || command.includes('tecnico');

    if (!mentionsAssignment || !mentionsTechnician) {
      return null;
    }

    const orderId = this.extractOrderId(dto.text);

    if (!orderId && !dto.activeOrderId) {
      console.log(
        '⚠️ Comando de asignación detectado pero no se encontró número de orden.',
      );
      return null;
    }

    return this.executeDirectAssignment(dto);
  }

  /**
   * Inicia un flujo de conversación
   */
  private startConversationFlow(
    dto: AssistantCommandDto,
    flowType: string,
  ): AssistantResponse {
    console.log('🚀 Iniciando flujo:', flowType, 'para usuario:', dto.userId);
    const context = this.conversationFlow.startFlow(dto.userId, flowType);
    console.log('📝 Contexto creado:', context);

    // Obtener el primer paso del flujo
    const result = this.conversationFlow.processFlowInput(
      context.sessionId,
      '',
    );
    console.log('📋 Primer paso del flujo:', result);

    return {
      spokenText: result.message,
      isConversationFlow: true,
      conversationSessionId: context.sessionId,
      confidence: 0.9,
    };
  }

  /**
   * Maneja el flujo de conversación activa
   */
  private async handleConversationFlow(
    dto: AssistantCommandDto,
    context: ConversationContext,
  ): Promise<AssistantResponse> {
    console.log('💬 Procesando input en conversación:', dto.text);
    const result = this.conversationFlow.processFlowInput(
      context.sessionId,
      dto.text,
    );
    console.log('📋 Resultado del flujo:', result);

    if (result.isComplete && result.action) {
      console.log('✅ Flujo completado, ejecutando acción:', result.action);
      // Ejecutar la acción final del flujo
      return this.executeFlowAction(result.action, result.data, dto);
    }

    return {
      spokenText: result.message,
      isConversationFlow: !result.isComplete,
      conversationSessionId: result.isComplete ? undefined : context.sessionId,
      confidence: 0.9,
      data: result.data,
    };
  }

  /**
   * Ejecuta acciones de flujos completados
   */
  private async executeFlowAction(
    action: string,
    data: any,
    dto: AssistantCommandDto,
  ): Promise<AssistantResponse> {
    switch (action) {
      case 'EXECUTE_CREATE_ORDER':
        return this.executeCreateOrder(dto, data);

      case 'EXECUTE_UPDATE_STATUS':
        return this.executeUpdateStatus(dto, data);

      case 'EXECUTE_RATE_ORDER':
        return this.executeRateOrder(dto, data);

      case 'EXECUTE_SHOW_EVIDENCES':
        return this.executeShowEvidences(dto, data);

      default:
        return {
          spokenText: 'Acción completada.',
          confidence: 0.8,
        };
    }
  }

  /**
   * Ejecuta asignación directa desde el comando inicial
   */
  private async executeDirectAssignment(
    dto: AssistantCommandDto,
  ): Promise<AssistantResponse> {
    try {
      console.log('🎯 Ejecutando asignación directa para:', dto.text);

      const orderId = this.extractOrderId(dto.text);
      const criteria = dto.text.toLowerCase();

      if (!orderId) {
        return {
          spokenText: 'No pude identificar el número de orden en tu comando.',
          confidence: 0.5,
        };
      }

      console.log('📋 Orden ID:', orderId, 'Criterio detectado:', criteria);

      let result: AssignmentResult;

      const technicianName = this.extractTechnicianName(dto.text);
      if (technicianName) {
        console.log(
          '👤 Asignación directa a técnico específico:',
          technicianName,
        );
        const technician =
          await this.technicianAssignment.findTechnicianByName(technicianName);
        if (technician) {
          result = await this.technicianAssignment.assignTechnicianToOrder(
            orderId,
            technician.id,
          );
        } else {
          result = {
            success: false,
            message: `No encontré al técnico ${technicianName}`,
            error: 'TECHNICIAN_NOT_FOUND',
          };
        }
      } else if (criteria.includes('cercano')) {
        console.log('📍 Asignación por proximidad...');
        const orden = await this.prisma.orden.findUnique({
          where: { id: orderId },
        });

        if (orden?.ubicacionLatitud && orden?.ubicacionLongitud) {
          const tecnico =
            await this.technicianAssignment.findClosestAvailableTechnician(
              orden.ubicacionLatitud,
              orden.ubicacionLongitud,
            );
          if (tecnico) {
            result = await this.technicianAssignment.assignTechnicianToOrder(
              orderId,
              tecnico.id,
            );
          } else {
            result = {
              success: false,
              message: 'No hay técnicos disponibles cerca',
            };
          }
        } else {
          result =
            await this.technicianAssignment.autoAssignTechnician(orderId);
        }
      } else if (criteria.includes('disponible')) {
        console.log('⏰ Asignación por disponibilidad...');
        const tecnico =
          await this.technicianAssignment.findMostAvailableTechnician();
        if (tecnico) {
          result = await this.technicianAssignment.assignTechnicianToOrder(
            orderId,
            tecnico.id,
          );
        } else {
          result = { success: false, message: 'No hay técnicos disponibles' };
        }
      } else {
        console.log('🤖 Asignación automática...');
        result = await this.technicianAssignment.autoAssignTechnician(orderId);
      }

      console.log('📋 Resultado asignación directa:', result);

      return {
        spokenText: result.message,
        confidence: result.success ? 0.9 : 0.7,
        actions: result.success
          ? [
              { type: 'REFRESH_ORDER_LIST' },
              { type: 'HIGHLIGHT_ORDER', payload: { orderId } },
            ]
          : [],
        data: { assignment: result },
      };
    } catch (error) {
      console.error('❌ Error en asignación directa:', error);
      return {
        spokenText:
          'Hubo un error al procesar la asignación. Por favor, intenta de nuevo.',
        confidence: 0.3,
      };
    }
  }

  /**
   * Ejecuta la asignación de técnico basada en los datos del flujo
   */
  private async executeAssignment(data: any): Promise<AssistantResponse> {
    try {
      console.log('🎯 Ejecutando asignación con datos:', data);
      const orderId = this.extractOrderId(data.ask_order);
      const criteria = data.ask_assignment_criteria?.toLowerCase() || '';
      console.log('📋 Orden ID extraído:', orderId, 'Criterio:', criteria);

      if (!orderId) {
        console.log('❌ No se pudo extraer el ID de orden');
        return {
          spokenText:
            'No pude identificar el número de orden. Por favor, intenta de nuevo.',
          confidence: 0.5,
        };
      }

      let result: AssignmentResult;

      console.log('🔍 Analizando criterio de asignación:', criteria);

      if (criteria.includes('cercano')) {
        console.log('📍 Buscando técnico más cercano...');
        // Buscar técnico más cercano
        const orden = await this.prisma.orden.findUnique({
          where: { id: orderId },
        });
        console.log(
          '📋 Orden encontrada:',
          !!orden,
          'Ubicación:',
          orden?.ubicacionLatitud,
          orden?.ubicacionLongitud,
        );

        if (orden?.ubicacionLatitud && orden?.ubicacionLongitud) {
          const tecnico =
            await this.technicianAssignment.findClosestAvailableTechnician(
              orden.ubicacionLatitud,
              orden.ubicacionLongitud,
            );
          console.log(
            '👷 Técnico más cercano encontrado:',
            !!tecnico,
            tecnico?.nombre,
          );

          if (tecnico) {
            result = await this.technicianAssignment.assignTechnicianToOrder(
              orderId,
              tecnico.id,
            );
          } else {
            result = {
              success: false,
              message: 'No hay técnicos disponibles cerca de la ubicación',
            };
          }
        } else {
          // Si no tiene ubicación, usar asignación automática
          console.log(
            '⚠️ Orden sin ubicación, usando asignación automática...',
          );
          result =
            await this.technicianAssignment.autoAssignTechnician(orderId);
        }
      } else if (criteria.includes('disponible')) {
        console.log('⏰ Buscando técnico más disponible...');
        // Buscar técnico más disponible
        const tecnico =
          await this.technicianAssignment.findMostAvailableTechnician();
        console.log(
          '👷 Técnico más disponible encontrado:',
          !!tecnico,
          tecnico?.nombre,
        );

        if (tecnico) {
          result = await this.technicianAssignment.assignTechnicianToOrder(
            orderId,
            tecnico.id,
          );
        } else {
          result = { success: false, message: 'No hay técnicos disponibles' };
        }
      } else if (criteria.includes('específico')) {
        console.log('🎯 Buscando técnico específico...');
        // Buscar técnico específico
        const tecnicoName = data.ask_specific_technician;
        console.log('👤 Nombre del técnico:', tecnicoName);

        const tecnico =
          await this.technicianAssignment.findTechnicianByName(tecnicoName);
        console.log(
          '👷 Técnico específico encontrado:',
          !!tecnico,
          tecnico?.nombre,
        );

        if (tecnico) {
          result = await this.technicianAssignment.assignTechnicianToOrder(
            orderId,
            tecnico.id,
          );
        } else {
          result = {
            success: false,
            message: `No encontré al técnico ${tecnicoName}`,
          };
        }
      } else {
        console.log('🤖 Usando asignación automática...');
        // Asignación automática
        result = await this.technicianAssignment.autoAssignTechnician(orderId);
      }

      console.log('📋 Resultado de la asignación:', result);

      return {
        spokenText: result.message,
        confidence: result.success ? 0.9 : 0.7,
        actions: result.success
          ? [
              { type: 'REFRESH_ORDER_LIST' },
              { type: 'HIGHLIGHT_ORDER', payload: { orderId } },
            ]
          : [],
        data: { assignment: result },
      };
    } catch (error) {
      console.error('Error ejecutando asignación:', error);
      return {
        spokenText:
          'Hubo un error al asignar el técnico. Por favor, intenta de nuevo.',
        confidence: 0.3,
      };
    }
  }

  /**
   * Ejecuta la creación de orden basada en los datos del flujo
   */
  private async executeCreateOrder(
    dto: AssistantCommandDto,
    data: any,
  ): Promise<AssistantResponse> {
    try {
      const problema = data.ask_problem?.toString().trim();
      const ubicacion = data.ask_location?.toString().trim();
      const prioridad = data.ask_priority?.toLowerCase();

      const prioridadMap = {
        alta: 'ALTA',
        media: 'MEDIA',
        baja: 'BAJA',
      };

      if (!problema) {
        return {
          spokenText:
            'No recibí una descripción clara del problema, no puedo crear la orden.',
          confidence: 0.4,
        };
      }

      // Solo los clientes pueden crear órdenes desde el asistente
      if (dto.role !== 'CLIENTE') {
        return {
          spokenText:
            'Solo los clientes pueden crear órdenes mediante el asistente.',
          confidence: 0.2,
        };
      }

      const cliente = await this.prisma.cliente.findUnique({
        where: { usuarioId: dto.userId },
      });

      if (!cliente) {
        return {
          spokenText:
            'No encontré un cliente asociado a tu usuario. No puedo crear la orden.',
          confidence: 0.3,
        };
      }

      const prioridadDb: Prioridad =
        (prioridadMap[prioridad] as Prioridad) || 'MEDIA';

      const nuevaOrden = await this.ordenesService.crearOrden(
        cliente.id,
        problema,
        prioridadDb,
        ubicacion || undefined,
        problema, // tipoProblema
        undefined, // ubicacionLatitud
        undefined, // ubicacionLongitud
        undefined, // nombreContacto
        undefined, // telefonoContacto
        undefined, // emailContacto
        undefined, // horarioPreferido
        undefined, // materialesRequeridos
        undefined, // observaciones
        undefined, // imagenes
        undefined, // costoEstimado
        undefined, // tiempoEstimadoHoras
      );

      let autoAssignMessage = '';

      const ordenConTecnico: any = nuevaOrden as any;
      if (ordenConTecnico?.tecnico) {
        const tecnicoNombre =
          ordenConTecnico.tecnico.nombre || 'un técnico disponible';
        autoAssignMessage = ` También he asignado automáticamente al técnico ${tecnicoNombre}.`;
      }

      const actions: AssistantAction[] = [
        { type: 'REFRESH_ORDER_LIST' },
        { type: 'HIGHLIGHT_ORDER', payload: { orderId: nuevaOrden.id } },
      ];

      const evidenciaRespuesta: string | undefined = data.ask_evidence;
      const evidenciaNormalized = evidenciaRespuesta
        ?.toString()
        .trim()
        .toLowerCase();

      if (
        evidenciaNormalized &&
        (evidenciaNormalized.includes('si') ||
          evidenciaNormalized.includes('sí'))
      ) {
        actions.push({
          type: 'OPEN_EVIDENCES',
          payload: {
            orderId: nuevaOrden.id,
            orden: nuevaOrden,
          },
        });
      }

      // Sugerir selección de ubicación precisa en el mapa
      actions.push({
        type: 'OPEN_LOCATION_PICKER',
        payload: {
          orderId: nuevaOrden.id,
        },
      });

      return {
        spokenText: `He creado la orden ${nuevaOrden.id} para el problema: ${problema}. La orden está pendiente de asignación.${autoAssignMessage}`,
        confidence: 0.9,
        actions,
        data: { orden: nuevaOrden },
      };
    } catch (error) {
      console.error('Error creando orden:', error);
      return {
        spokenText:
          'Hubo un error al crear la orden. Por favor, intenta de nuevo.',
        confidence: 0.3,
      };
    }
  }

  /**
   * Ejecuta la actualización de estado basada en los datos del flujo
   */
  private async executeUpdateStatus(
    dto: AssistantCommandDto,
    data: any,
  ): Promise<AssistantResponse> {
    try {
      const orderId = this.extractOrderId(data.ask_order_id);
      const nuevoEstado = data.ask_new_status?.toLowerCase();

      const estadoMap = {
        'en proceso': 'EN_PROCESO',
        completado: 'COMPLETADO',
        cancelado: 'CANCELADO',
        pausado: 'PAUSADO',
      };

      const estadoDB = estadoMap[nuevoEstado];

      if (!orderId || !estadoDB) {
        return {
          spokenText:
            'No pude identificar la orden o el estado. Por favor, intenta de nuevo.',
          confidence: 0.5,
        };
      }

      const ordenActualizada = await this.prisma.orden.update({
        where: { id: orderId },
        data: {
          estado: estadoDB as any,
          fechaCompletado: estadoDB === 'COMPLETADO' ? new Date() : null,
        },
      });

      // Si se completa la orden, actualizar estado del técnico
      if (estadoDB === 'COMPLETADO') {
        await this.technicianAssignment.updateTechnicianStatusOnOrderComplete(
          orderId,
        );
      }

      let spokenText = `He actualizado la orden ${orderId} a estado ${nuevoEstado}.`;
      const actions: AssistantAction[] = [
        { type: 'REFRESH_ORDER_LIST' },
        { type: 'HIGHLIGHT_ORDER', payload: { orderId } },
      ];

      const extraData: any = { orden: ordenActualizada };

      // Sugerencias técnicas automáticas para el técnico al pasar a EN_PROCESO
      if (estadoDB === 'EN_PROCESO' && dto.role === 'TECNICO') {
        try {
          const orden = await this.prisma.orden.findUnique({
            where: { id: orderId },
            select: {
              descripcion: true,
              tipoProblema: true,
            },
          });

          const problemaTexto = orden?.tipoProblema || orden?.descripcion;

          if (problemaTexto) {
            const ragPrompt = `Soy un técnico de campo y estoy atendiendo este problema: "${problemaTexto}". Dame una guía breve y concreta de diagnóstico y pasos recomendados para resolverlo.`;
            const ragResponse = await this.rag.answer(ragPrompt);
            extraData.techSuggestions = ragResponse.answer;
            spokenText +=
              ' Además, he generado algunas sugerencias técnicas para ayudarte con el diagnóstico.';
          }
        } catch (error) {
          console.error('Error generando sugerencias técnicas con RAG:', error);
        }
      }

      // Automatizaciones al completar la orden
      if (estadoDB === 'COMPLETADO') {
        try {
          const ordenCompleta = await this.prisma.orden.findUnique({
            where: { id: orderId },
            include: {
              cliente: {
                include: { usuario: true },
              },
              evidencias: true,
            },
          });

          if (ordenCompleta) {
            const evidenciasCount = ordenCompleta.evidencias?.length || 0;

            if (evidenciasCount === 0) {
              spokenText +=
                ' No encontré evidencias registradas para esta orden. Te recomiendo subir fotos del trabajo realizado.';
            } else {
              spokenText += ` Esta orden tiene ${evidenciasCount} evidencias registradas.`;
            }

            // Notificar al cliente para que califique el servicio
            const clienteUsuarioId = ordenCompleta.cliente?.usuario?.id;

            if (clienteUsuarioId) {
              try {
                await this.notificacionesService.crear({
                  usuarioId: clienteUsuarioId,
                  tipo: 'ORDEN_ACTUALIZADA',
                  titulo: '⭐ ¿Cómo fue el servicio?',
                  mensaje: `Tu orden #${orderId} ha sido completada. Puedes calificar el servicio desde la app o hablando con el asistente.`,
                  ordenId: orderId,
                });
              } catch (error) {
                console.error(
                  'Error creando notificación de calificación para el cliente:',
                  error,
                );
              }
            }

            extraData.orden = ordenCompleta;
          }
        } catch (error) {
          console.error('Error en automatizaciones de post-servicio:', error);
        }
      }

      return {
        spokenText,
        confidence: 0.9,
        actions,
        data: extraData,
      };
    } catch (error) {
      console.error('Error actualizando estado:', error);
      return {
        spokenText:
          'Hubo un error al actualizar el estado. Por favor, intenta de nuevo.',
        confidence: 0.3,
      };
    }
  }

  /**
   * Ejecuta la calificación de una orden basada en los datos del flujo
   */
  private async executeRateOrder(
    dto: AssistantCommandDto,
    data: any,
  ): Promise<AssistantResponse> {
    try {
      if (dto.role !== 'CLIENTE') {
        return {
          spokenText: 'Solo los clientes pueden calificar el servicio.',
          confidence: 0.2,
        };
      }

      const orderId = this.extractOrderId(data.ask_order_id);

      if (!orderId) {
        return {
          spokenText:
            'No pude identificar el número de orden que quieres calificar.',
          confidence: 0.5,
        };
      }

      const ratingRaw = data.ask_rating;
      const ratingText = ratingRaw?.toString() ?? '';
      const normalizedRating = this.normalizeNumberWords(ratingText);
      const ratingMatch = normalizedRating.match(/\b([1-5])\b/);
      const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : NaN;

      if (!rating || rating < 1 || rating > 5) {
        return {
          spokenText: 'No entendí la calificación. Dime un número del 1 al 5.',
          confidence: 0.5,
        };
      }

      const commentRaw = data.ask_comment?.toString().trim() || '';
      const commentLower = commentRaw.toLowerCase();
      const comentario =
        !commentRaw ||
        commentLower === 'no' ||
        commentLower === 'ninguno' ||
        commentLower === 'ninguna'
          ? undefined
          : commentRaw;

      const orden = await this.prisma.orden.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          estado: true,
          cliente: {
            select: { usuarioId: true },
          },
        },
      });

      if (!orden) {
        return {
          spokenText: `No encontré la orden ${orderId}.`,
          confidence: 0.5,
        };
      }

      if (orden.cliente?.usuarioId !== dto.userId) {
        return {
          spokenText: 'Solo puedes calificar órdenes que te pertenecen.',
          confidence: 0.4,
        };
      }

      if (orden.estado !== 'COMPLETADO') {
        const estadoTexto = this.translateStatus(orden.estado as any);
        return {
          spokenText: `Solo puedes calificar órdenes completadas. La orden ${orderId} está ${estadoTexto}.`,
          confidence: 0.5,
        };
      }

      const ordenCalificada = await this.prisma.orden.update({
        where: { id: orderId },
        data: {
          calificacion: rating,
          comentarioCalificacion: comentario,
        },
      });

      return {
        spokenText: `He registrado tu calificación de ${rating} sobre 5 para la orden ${orderId}. ¡Gracias por tu feedback!`,
        confidence: 0.9,
        actions: [
          { type: 'REFRESH_ORDER_LIST' },
          { type: 'HIGHLIGHT_ORDER', payload: { orderId } },
        ],
        data: { orden: ordenCalificada },
      };
    } catch (error) {
      console.error('Error calificando servicio:', error);
      return {
        spokenText:
          'Hubo un error al registrar tu calificación. Por favor, intenta de nuevo.',
        confidence: 0.3,
      };
    }
  }

  /**
   * Abre las evidencias de una orden basada en los datos del flujo
   */
  private async executeShowEvidences(
    dto: AssistantCommandDto,
    data: any,
  ): Promise<AssistantResponse> {
    try {
      const orderId =
        this.extractOrderId(data.ask_order_id) || dto.activeOrderId;

      if (!orderId) {
        return {
          spokenText:
            'No pude identificar la orden para mostrar sus evidencias.',
          confidence: 0.5,
        };
      }

      const orden = await this.prisma.orden.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          tecnicoid: true,
          cliente: {
            select: { usuarioId: true },
          },
        },
      });

      if (!orden) {
        return {
          spokenText: `No encontré la orden ${orderId}.`,
          confidence: 0.5,
        };
      }

      if (dto.role === 'TECNICO') {
        const tecnico = await this.prisma.tecnico.findUnique({
          where: { usuarioid: dto.userId },
          select: { id: true },
        });

        if (!tecnico || orden.tecnicoid !== tecnico.id) {
          return {
            spokenText:
              'Solo puedes ver las evidencias de las órdenes que te han sido asignadas.',
            confidence: 0.4,
          };
        }
      }

      if (dto.role === 'CLIENTE' && orden.cliente?.usuarioId !== dto.userId) {
        return {
          spokenText: 'Solo puedes ver las evidencias de tus propias órdenes.',
          confidence: 0.4,
        };
      }

      return {
        spokenText: `Abriendo las evidencias de la orden ${orderId}.`,
        confidence: 0.9,
        actions: [
          {
            type: 'OPEN_EVIDENCES',
            payload: {
              orderId: orden.id,
              orden,
            },
          },
        ],
        data: { orden },
      };
    } catch (error) {
      console.error('Error mostrando evidencias:', error);
      return {
        spokenText:
          'Hubo un error al abrir las evidencias de la orden. Por favor, intenta de nuevo.',
        confidence: 0.3,
      };
    }
  }

  /**
   * Extrae el ID de orden del texto del usuario
   */
  private extractOrderId(text: string): number | null {
    console.log('🔍 Extrayendo ID de orden del texto:', text);
    const normalizedText = this.normalizeNumberWords(text);
    const matches = normalizedText.match(/\b(\d+)\b/);
    const orderId = matches ? parseInt(matches[1]) : null;
    console.log('📋 ID de orden extraído:', orderId);
    return orderId;
  }

  /**
   * Reemplaza palabras numéricas básicas por dígitos para facilitar la detección
   */
  private normalizeNumberWords(text: string): string {
    if (!text) return '';

    const replacements: Record<string, string> = {
      cero: '0',
      uno: '1',
      una: '1',
      un: '1',
      dos: '2',
      tres: '3',
      cuatro: '4',
      cinco: '5',
      seis: '6',
      siete: '7',
      ocho: '8',
      nueve: '9',
      diez: '10',
      once: '11',
      doce: '12',
      trece: '13',
      catorce: '14',
      quince: '15',
      dieciseis: '16',
      dieciséis: '16',
      diecisiete: '17',
      dieciocho: '18',
      diecinueve: '19',
      veinte: '20',
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

  /**
   * Intenta extraer el nombre del técnico a partir del comando
   */
  private extractTechnicianName(text: string): string | null {
    if (!text) return null;

    const normalizedCommand = text.replace(/\s+/g, ' ').trim();
    const pattern =
      /(?:orden|order)\s+[^\s]+.*?(?:a|al)\s+(?:t[eé]cnic[oa]\s+)?([a-záéíóúñ\s]+)$/i;
    const match = normalizedCommand.match(pattern);

    if (!match) {
      return null;
    }

    const name = match[1]
      .replace(/[.,;:]?$/g, '')
      .replace(/\b(por favor|porfa|gracias|urgente|rápido|rapido)\b/gi, '')
      .trim();

    if (!name) {
      return null;
    }

    const sanitized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const forbiddenKeywords = [
      'automatico',
      'automatica',
      'automaticamente',
      'automático',
      'automática',
      'cercano',
      'cerca',
      'disponible',
      'disponibles',
    ];

    if (forbiddenKeywords.some((word) => sanitized.includes(word))) {
      return null;
    }

    return name;
  }

  /**
   * Maneja consultas técnicas usando RAG
   */
  private async handleTechnicalQuery(
    dto: AssistantCommandDto,
    intent: DetectedIntent,
  ): Promise<AssistantResponse> {
    const ragResponse = await this.rag.answer(intent.rawText);

    return {
      spokenText: ragResponse.answer,
      data: {
        usedDocs: ragResponse.usedDocs,
        category: ragResponse.category,
      },
      confidence: ragResponse.confidence,
      usedRAG: true,
    };
  }

  /**
   * Ejecuta una intención específica
   */
  private async executeIntent(
    dto: AssistantCommandDto,
    intent: DetectedIntent,
  ): Promise<AssistantResponse> {
    switch (intent.intent) {
      case 'GET_ORDER_STATUS':
        return this.getOrderStatus(dto, intent);

      case 'GET_CLIENT_ORDERS':
        return this.getClientOrders(dto, intent);

      case 'UPDATE_ORDER_STATUS':
        return this.updateOrderStatus(dto, intent);

      case 'ASSIGN_TECHNICIAN':
        return this.assignTechnician(dto, intent);

      case 'SHOW_ROUTE':
        return this.showRoute(dto, intent);

      case 'GET_TECHNICIAN_LOCATION':
        return this.getTechnicianLocation(dto, intent);

      case 'RESCHEDULE_ORDER':
        return this.rescheduleOrder(dto, intent);

      case 'GET_DAILY_REPORT':
        return this.getDailyReport(dto);

      case 'GET_TECHNICIAN_PERFORMANCE':
        return this.getTechnicianPerformance(dto, intent);

      case 'GET_CRITICAL_ALERTS':
        return this.getCriticalAlerts(dto, intent);

      case 'GET_ORDERS_SUMMARY':
        return this.getOrdersSummary(dto, intent);

      case 'GET_INVENTORY_ITEM':
      case 'REQUEST_MATERIAL':
        return this.handleInventory(dto, intent);

      default:
        return { spokenText: 'No entendí ese comando específico.' };
    }
  }

  /**
   * Obtener estado de orden
   */
  private async getOrderStatus(
    dto: AssistantCommandDto,
    intent: DetectedIntent,
  ): Promise<AssistantResponse> {
    try {
      const orderId = intent.orderId || dto.activeOrderId;

      if (!orderId) {
        return { spokenText: 'No especificaste qué orden consultar.' };
      }

      const orden = await this.prisma.orden.findUnique({
        where: { id: orderId },
        include: {
          tecnico: { include: { usuario: true } },
          cliente: true,
        },
      });

      if (!orden) {
        return { spokenText: `No encontré la orden ${orderId}.` };
      }

      const estado = this.translateStatus(orden.estado);
      const tecnico = orden.tecnico?.usuario?.usuario || 'sin asignar';

      return {
        spokenText: `La orden ${orden.id} está ${estado}. Técnico asignado: ${tecnico}.`,
        data: { orden },
        actions: [{ type: 'HIGHLIGHT_ORDER', payload: { orderId } }],
      };
    } catch (error) {
      console.error('Error obteniendo estado:', error);
      return { spokenText: 'Error al consultar el estado de la orden.' };
    }
  }

  /**
   * Listar órdenes del usuario (cliente o técnico)
   */
  private async getClientOrders(
    dto: AssistantCommandDto,
    intent: DetectedIntent,
  ): Promise<AssistantResponse> {
    try {
      const where: any = {};
      let ownerDescription = '';

      // Determinar propietario según rol
      if (dto.role === 'TECNICO') {
        const tecnico = await this.prisma.tecnico.findFirst({
          where: { usuarioid: dto.userId },
        });

        if (!tecnico) {
          return {
            spokenText: 'No encontré el técnico asociado a tu usuario.',
          };
        }

        where.tecnicoid = tecnico.id;
        ownerDescription = 'asignadas a ti';
      } else if (dto.role === 'CLIENTE') {
        const cliente = await this.prisma.cliente.findFirst({
          where: { usuarioId: dto.userId },
        });

        if (!cliente) {
          return {
            spokenText: 'No encontré el cliente asociado a tu usuario.',
          };
        }

        where.clienteid = cliente.id;
        ownerDescription = 'tuyas';
      } else if (dto.role === 'ADMIN') {
        if (intent.clientId) {
          where.clienteid = intent.clientId;
          ownerDescription = `del cliente ${intent.clientId}`;
        } else {
          ownerDescription = 'del sistema';
        }
      }

      // Filtro por estado si viene en la intención
      let estadoDB: string | null = null;
      if (intent.status) {
        estadoDB = this.mapStatusToDatabase(intent.status);
      }
      if (estadoDB) {
        where.estado = estadoDB as any;
      }

      const ordenes = await this.prisma.orden.findMany({
        where,
        orderBy: { fechasolicitud: 'desc' },
        include: {
          cliente: true,
          tecnico: true,
        },
        take: 10,
      });

      if (!ordenes.length) {
        if (estadoDB) {
          const estadoTexto = this.translateStatus(estadoDB as any);
          return {
            spokenText: `No encontré órdenes ${estadoTexto} ${ownerDescription}.`,
          };
        }

        return {
          spokenText: `No encontré órdenes ${ownerDescription}.`,
        };
      }

      const total = ordenes.length;
      const primeras = ordenes.slice(0, 3);
      const descripciones = primeras
        .map((o) => {
          const estadoTexto = this.translateStatus(o.estado as any);
          const clienteNombre = o.cliente?.nombre || 'sin cliente';
          return `orden ${o.id} ${estadoTexto} para ${clienteNombre}`;
        })
        .join('; ');

      let mensajeBase = '';
      if (estadoDB) {
        const estadoTexto = this.translateStatus(estadoDB as any);
        mensajeBase = `Tienes ${total} órdenes ${estadoTexto} ${ownerDescription}.`;
      } else {
        mensajeBase = `Tienes ${total} órdenes ${ownerDescription}.`;
      }

      const spokenText = `${mensajeBase} Las más recientes son: ${descripciones}.`;

      const actions: AssistantAction[] = [
        { type: 'REFRESH_ORDER_LIST' },
        { type: 'HIGHLIGHT_ORDER', payload: { orderId: ordenes[0].id } },
      ];

      return {
        spokenText,
        data: { ordenes },
        actions,
      };
    } catch (error) {
      console.error('Error obteniendo órdenes del usuario:', error);
      return {
        spokenText:
          'Hubo un error al consultar tus órdenes. Por favor, intenta de nuevo.',
      };
    }
  }

  /**
   * Actualizar estado de orden
   */
  private async updateOrderStatus(
    dto: AssistantCommandDto,
    intent: DetectedIntent,
  ): Promise<AssistantResponse> {
    try {
      const orderId = intent.orderId || dto.activeOrderId;
      const newStatus = this.mapStatusToDatabase(intent.status || '');

      if (!orderId || !newStatus) {
        return {
          spokenText: 'No pude identificar la orden o el estado a actualizar.',
        };
      }

      const updated = await this.prisma.orden.update({
        where: { id: orderId },
        data: { estado: newStatus as any },
      });

      const statusText = this.translateStatus(newStatus);

      return {
        spokenText: `He actualizado la orden ${orderId} a estado ${statusText}.`,
        data: { orden: updated },
        actions: [
          { type: 'REFRESH_ORDER_LIST' },
          { type: 'HIGHLIGHT_ORDER', payload: { orderId } },
        ],
      };
    } catch (error) {
      console.error('Error actualizando estado:', error);
      return { spokenText: 'Error al actualizar el estado de la orden.' };
    }
  }

  /**
   * Asignar técnico
   */
  private async assignTechnician(
    dto: AssistantCommandDto,
    intent: DetectedIntent,
  ): Promise<AssistantResponse> {
    try {
      const orderId = intent.orderId || dto.activeOrderId;

      if (!orderId) {
        return { spokenText: 'No especificaste qué orden asignar.' };
      }

      // Buscar técnico por nombre en el texto
      const tecnico = await this.findTechnicianByName(intent.rawText);

      if (!tecnico) {
        return { spokenText: 'No encontré al técnico mencionado.' };
      }

      await this.prisma.orden.update({
        where: { id: orderId },
        data: { tecnicoid: tecnico.id },
      });

      return {
        spokenText: `He asignado la orden ${orderId} al técnico ${tecnico.usuario.usuario}.`,
        actions: [
          { type: 'REFRESH_ORDER_LIST' },
          { type: 'OPEN_ORDER_DETAIL', payload: { orderId } },
        ],
      };
    } catch (error) {
      console.error('Error asignando técnico:', error);
      return { spokenText: 'Error al asignar el técnico.' };
    }
  }

  /**
   * Mostrar ruta
   */
  private async showRoute(
    dto: AssistantCommandDto,
    intent: DetectedIntent,
  ): Promise<AssistantResponse> {
    const orderId = intent.orderId || dto.activeOrderId;

    if (!orderId) {
      return { spokenText: 'No especificaste para qué orden mostrar la ruta.' };
    }

    return {
      spokenText: 'Abriendo el mapa con la ruta hacia el cliente.',
      actions: [{ type: 'OPEN_ORDER_MAP', payload: { orderId } }],
    };
  }

  /**
   * Obtener ubicación de técnico
   */
  private async getTechnicianLocation(
    dto: AssistantCommandDto,
    intent: DetectedIntent,
  ): Promise<AssistantResponse> {
    try {
      const tecnicoId = intent.technicianId || dto.userId;

      // Buscar última ubicación registrada
      const ubicacion = await this.prisma.$queryRaw`
        SELECT lat, lng, "updatedAt" 
        FROM "TecnicoUbicacion" 
        WHERE "tecnicoId" = ${tecnicoId}
        ORDER BY "updatedAt" DESC 
        LIMIT 1
      `;

      if (!ubicacion || (ubicacion as any[]).length === 0) {
        return { spokenText: 'No hay ubicación registrada para este técnico.' };
      }

      const loc = (ubicacion as any[])[0];
      const timeAgo = this.getTimeAgo(new Date(loc.updatedAt));

      return {
        spokenText: `El técnico se encuentra en las coordenadas ${loc.lat}, ${loc.lng}. Última actualización: ${timeAgo}.`,
        data: { ubicacion: loc },
        actions: [
          {
            type: 'SHOW_TECHNICIAN_LOCATION',
            payload: { lat: loc.lat, lng: loc.lng },
          },
        ],
      };
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      return { spokenText: 'Error al consultar la ubicación del técnico.' };
    }
  }

  /**
   * Reprogramar orden
   */
  private async rescheduleOrder(
    dto: AssistantCommandDto,
    intent: DetectedIntent,
  ): Promise<AssistantResponse> {
    try {
      const orderId = intent.orderId || dto.activeOrderId;

      if (!orderId || !intent.dateTime) {
        return { spokenText: 'No pude identificar la orden o la nueva fecha.' };
      }

      const newDate = new Date(intent.dateTime);

      await this.prisma.orden.update({
        where: { id: orderId },
        data: { fechasolicitud: newDate },
      });

      return {
        spokenText: `He reprogramado la orden ${orderId} para ${newDate.toLocaleDateString()}.`,
        actions: [
          { type: 'REFRESH_ORDER_LIST' },
          { type: 'OPEN_ORDER_DETAIL', payload: { orderId } },
        ],
      };
    } catch (error) {
      console.error('Error reprogramando:', error);
      return { spokenText: 'Error al reprogramar la orden.' };
    }
  }

  /**
   * Generar reporte diario
   */
  private async getDailyReport(
    dto: AssistantCommandDto,
  ): Promise<AssistantResponse> {
    return {
      spokenText: 'Generando reporte del día. Te mostraré las estadísticas.',
      actions: [{ type: 'OPEN_DAILY_REPORT' }],
    };
  }

  private async getTechnicianPerformance(
    dto: AssistantCommandDto,
    intent: DetectedIntent,
  ): Promise<AssistantResponse> {
    if (dto.role !== 'ADMIN') {
      return {
        spokenText:
          'La consulta de rendimiento de técnicos solo está disponible para administradores.',
      };
    }

    const now = new Date();
    const since = new Date(now);
    since.setDate(since.getDate() - 7);

    const orders = await this.prisma.orden.findMany({
      where: {
        fechaCompletado: {
          gte: since,
        },
      },
      include: {
        tecnico: true,
      },
    });

    if (!orders.length) {
      return {
        spokenText:
          'En los últimos 7 días no se han completado órdenes, no hay datos de rendimiento.',
      };
    }

    const statsMap = new Map<
      number,
      { nombre: string; completadas: number; horasTotales: number }
    >();

    for (const orden of orders) {
      if (!orden.tecnico) continue;

      const tecnicoId = orden.tecnico.id;
      const nombre = orden.tecnico.nombre;
      const start = orden.fechasolicitud
        ? new Date(orden.fechasolicitud)
        : null;
      const end = orden.fechaCompletado
        ? new Date(orden.fechaCompletado)
        : null;
      const horas =
        start && end ? (end.getTime() - start.getTime()) / 3600000 : 0;

      const current = statsMap.get(tecnicoId) || {
        nombre,
        completadas: 0,
        horasTotales: 0,
      };
      current.completadas += 1;
      current.horasTotales += horas;
      statsMap.set(tecnicoId, current);
    }

    const statsArray = Array.from(statsMap.values()).sort(
      (a, b) => b.completadas - a.completadas,
    );

    if (!statsArray.length) {
      return {
        spokenText:
          'No encontré técnicos con órdenes completadas en los últimos 7 días.',
      };
    }

    const top = statsArray.slice(0, 3);
    const totalOrdenes = orders.length;

    const resumenTecnicos = top
      .map((t) => {
        const promedioHoras =
          t.completadas > 0 ? t.horasTotales / t.completadas : 0;
        const horasRedondeadas = Math.round(promedioHoras * 10) / 10;
        return `${t.nombre} con ${t.completadas} órdenes completadas y un tiempo promedio de ${horasRedondeadas} horas`;
      })
      .join('; ');

    const spokenText = `En los últimos 7 días se completaron ${totalOrdenes} órdenes. Los mejores desempeños son: ${resumenTecnicos}.`;

    return {
      spokenText,
      data: {
        periodoDias: 7,
        totalOrdenes,
        tecnicos: statsArray,
      },
      actions: [{ type: 'OPEN_DAILY_REPORT' }],
    };
  }

  private async getCriticalAlerts(
    dto: AssistantCommandDto,
    intent: DetectedIntent,
  ): Promise<AssistantResponse> {
    if (dto.role !== 'ADMIN') {
      return {
        spokenText:
          'Las alertas críticas solo pueden ser consultadas por administradores.',
      };
    }

    const now = new Date();
    const since = new Date(now);
    since.setDate(since.getDate() - 7);

    const criticalOrders = await this.prisma.orden.findMany({
      where: {
        prioridad: 'ALTA',
        estado: {
          in: ['PENDIENTE', 'EN_PROCESO'],
        },
        fechasolicitud: {
          gte: since,
        },
      },
      include: {
        cliente: true,
      },
      orderBy: {
        fechasolicitud: 'asc',
      },
      take: 5,
    });

    const iotAlerts = await this.prisma.alerta.findMany({
      where: {
        resuelta: false,
      },
      include: {
        sensor: true,
        orden: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    if (!criticalOrders.length && !iotAlerts.length) {
      return {
        spokenText:
          'No se encontraron órdenes críticas ni alertas IoT activas en este momento.',
      };
    }

    const partes: string[] = [];

    if (criticalOrders.length) {
      const ids = criticalOrders.map((o) => o.id).join(', ');
      partes.push(
        `Tienes ${criticalOrders.length} órdenes de alta prioridad pendientes o en proceso, incluyendo las órdenes ${ids}.`,
      );
    }

    if (iotAlerts.length) {
      partes.push(`Además hay ${iotAlerts.length} alertas IoT activas.`);
    }

    const actions: AssistantAction[] = [{ type: 'OPEN_CRITICAL_ALERTS' }];

    if (criticalOrders.length) {
      actions.push({
        type: 'HIGHLIGHT_ORDER',
        payload: { orderId: criticalOrders[0].id },
      });
    }

    return {
      spokenText: partes.join(' '),
      data: {
        criticalOrders,
        iotAlerts,
      },
      actions,
    };
  }

  private async getOrdersSummary(
    dto: AssistantCommandDto,
    intent: DetectedIntent,
  ): Promise<AssistantResponse> {
    const now = new Date();
    const text = (intent.rawText || '').toLowerCase();

    let since: Date;

    if (text.includes('hoy')) {
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (text.includes('semana')) {
      since = new Date(now);
      since.setDate(since.getDate() - 7);
    } else if (text.includes('mes')) {
      since = new Date(now);
      since.setMonth(since.getMonth() - 1);
    } else {
      since = new Date(now);
      since.setDate(since.getDate() - 7);
    }

    const where: any = {
      fechasolicitud: {
        gte: since,
      },
    };

    if (dto.role === 'TECNICO') {
      const tecnico = await this.prisma.tecnico.findFirst({
        where: {
          usuarioid: dto.userId,
        },
      });

      if (!tecnico) {
        return {
          spokenText: 'No encontré el técnico asociado a tu usuario.',
        };
      }

      where.tecnicoid = tecnico.id;
    } else if (dto.role === 'CLIENTE') {
      const cliente = await this.prisma.cliente.findFirst({
        where: {
          usuarioId: dto.userId,
        },
      });

      if (!cliente) {
        return {
          spokenText: 'No encontré el cliente asociado a tu usuario.',
        };
      }

      where.clienteid = cliente.id;
    }

    const ordenes = await this.prisma.orden.findMany({
      where,
    });

    if (!ordenes.length) {
      const rolTexto = dto.role === 'ADMIN' ? 'el sistema' : 'tú';
      return {
        spokenText: `No se encontraron órdenes para ${rolTexto} en el período indicado.`,
      };
    }

    const total = ordenes.length;
    const pendientes = ordenes.filter((o) => o.estado === 'PENDIENTE').length;
    const asignadas = ordenes.filter((o) => o.estado === 'ASIGNADO').length;
    const enProceso = ordenes.filter((o) => o.estado === 'EN_PROCESO').length;
    const completadas = ordenes.filter((o) => o.estado === 'COMPLETADO').length;
    const canceladas = ordenes.filter((o) => o.estado === 'CANCELADO').length;

    const dias = Math.max(
      1,
      Math.round((now.getTime() - since.getTime()) / 86400000),
    );

    const prefijo = dto.role === 'ADMIN' ? 'del sistema' : 'tuyas';
    const spokenText = `En los últimos ${dias} días hay ${total} órdenes ${prefijo}: ${pendientes} pendientes, ${asignadas} asignadas, ${enProceso} en proceso, ${completadas} completadas y ${canceladas} canceladas.`;

    const actions: AssistantAction[] = [];

    if (dto.role === 'ADMIN') {
      actions.push({ type: 'OPEN_ORDERS_SUMMARY' });
    } else if (dto.role === 'TECNICO' || dto.role === 'CLIENTE') {
      actions.push({ type: 'OPEN_ORDERS_SUMMARY' });
    }

    return {
      spokenText,
      data: {
        periodoDesde: since,
        periodoHasta: now,
        total,
        pendientes,
        asignadas,
        enProceso,
        completadas,
        canceladas,
      },
      actions,
    };
  }

  /**
   * Manejar inventario
   */
  private async handleInventory(
    dto: AssistantCommandDto,
    intent: DetectedIntent,
  ): Promise<AssistantResponse> {
    const ragResponse = await this.rag.getMaterialInfo(
      intent.itemName || intent.rawText,
    );

    return {
      spokenText: ragResponse.answer,
      data: { usedDocs: ragResponse.usedDocs },
      usedRAG: true,
    };
  }

  // Métodos auxiliares
  private async findTechnicianByName(text: string): Promise<any> {
    const tecnicos = await this.prisma.tecnico.findMany({
      include: { usuario: true },
    });

    const textLower = text.toLowerCase();
    return tecnicos.find(
      (t) =>
        textLower.includes(t.usuario.usuario.toLowerCase()) ||
        textLower.includes(t.nombre?.toLowerCase() || ''),
    );
  }

  private translateStatus(status: string): string {
    const translations = {
      PENDIENTE: 'pendiente',
      ASIGNADA: 'asignada',
      EN_PROCESO: 'en proceso',
      COMPLETADA: 'completada',
      CANCELADA: 'cancelada',
    };
    return translations[status] || status;
  }

  private mapStatusToDatabase(status: string): string {
    const mappings = {
      ARRIVED: 'EN_PROCESO',
      IN_PROGRESS: 'EN_PROCESO',
      COMPLETED: 'COMPLETADA',
      CANCELLED: 'CANCELADA',
    };
    return mappings[status] || status;
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'hace menos de un minuto';
    if (diffMins < 60) return `hace ${diffMins} minutos`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours} horas`;

    const diffDays = Math.floor(diffHours / 24);
    return `hace ${diffDays} días`;
  }
}
