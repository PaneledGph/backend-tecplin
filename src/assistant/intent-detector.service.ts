import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface DetectedIntent {
  intent: string;
  orderId?: number;
  technicianId?: number;
  clientId?: number;
  status?: string;
  itemName?: string;
  dateTime?: string;
  extraIntents?: DetectedIntent[];
  rawText: string;
  confidence?: number;
}

export interface AssistantCommandDto {
  text: string;
  userId: number;
  role: 'ADMIN' | 'TECNICO' | 'CLIENTE';
  activeOrderId?: number;
}

@Injectable()
export class IntentDetectorService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  async detect(command: AssistantCommandDto): Promise<DetectedIntent> {
    const text = command.text.trim();
    // Intentar con diferentes modelos disponibles
    let model;
    try {
      model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    } catch (error) {
      console.log('⚠️ gemini-1.5-pro no disponible, intentando gemini-pro...');
      model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    }

    const prompt = `
Eres el motor de interpretación de un asistente de órdenes técnicas para la empresa TECPLIN.
Tu tarea es analizar el texto y devolver SOLO un JSON válido.

NO escribas nada que no sea JSON. NO expliques nada. SOLO JSON.

El JSON debe tener esta forma:

{
  "intent": "...",
  "orderId": número o null,
  "technicianId": número o null,
  "clientId": número o null,
  "status": "...",
  "itemName": "...",
  "dateTime": "...",
  "extraIntents": [ { "intent": "...", "orderId": n, ... } ],
  "rawText": "...",
  "confidence": 0.95
}

INTENTS PERMITIDOS POR ROL:

ADMIN:
- GET_DAILY_REPORT, GET_TECHNICIAN_PERFORMANCE, ASSIGN_TECHNICIAN
- CREATE_ORDER, CANCEL_ORDER, UPDATE_ORDER_STATUS
- GET_ORDER_STATUS, GET_CLIENT_ORDERS, RESCHEDULE_ORDER
- GET_INVENTORY_ITEM, REQUEST_MATERIAL

TECNICO:
- UPDATE_ORDER_STATUS, SHOW_ROUTE, GET_TECHNICIAN_LOCATION
- REGISTER_EVIDENCE, GET_ORDER_STATUS, TECH_DIAGNOSIS
- REQUEST_MATERIAL, GET_CLIENT_ORDERS (solo sus órdenes)

CLIENTE:
- CREATE_ORDER, GET_ORDER_STATUS, RESCHEDULE_ORDER
- CANCEL_ORDER (solo sus órdenes), GET_CLIENT_ORDERS (solo sus órdenes)

REGLAS POR ROL:

ADMIN:
- "reporte del día", "dashboard", "estadísticas" → GET_DAILY_REPORT
- "asignar técnico", "asigna a [nombre]" → ASSIGN_TECHNICIAN
- "rendimiento de técnicos" → GET_TECHNICIAN_PERFORMANCE
- "crear orden", "nueva orden" → CREATE_ORDER
- "cancelar orden" → CANCEL_ORDER

TECNICO:
- "ya llegué", "llegué al cliente" → UPDATE_ORDER_STATUS + status = "ARRIVED"
- "iniciar trabajo", "empezar" → UPDATE_ORDER_STATUS + status = "IN_PROGRESS"
- "terminé", "completado" → UPDATE_ORDER_STATUS + status = "COMPLETED"
- "muéstrame la ruta", "navegación" → SHOW_ROUTE
- "¿cómo diagnosticar?", "problema técnico" → TECH_DIAGNOSIS
- "mis órdenes" → GET_CLIENT_ORDERS

CLIENTE:
- "crear orden", "tengo un problema" → CREATE_ORDER
- "estado de mi orden", "¿cómo va?" → GET_ORDER_STATUS
- "reprogramar", "cambiar fecha" → RESCHEDULE_ORDER
- "cancelar mi orden" → CANCEL_ORDER
- "mis órdenes" → GET_CLIENT_ORDERS

DEVUELVE INTENT "UNKNOWN" si no estás seguro.

ROL: ${command.role}
ORDEN ACTIVA: ${command.activeOrderId ?? 'ninguna'}
COMANDO: "${text}"
`;

    try {
      console.log('🤖 Enviando prompt a Gemini para:', text);
      const result = await model.generateContent(prompt);
      const jsonString = result.response.text().trim();
      
      console.log('🤖 Respuesta cruda de Gemini:', jsonString);
      
      // Limpiar posibles caracteres extra del JSON
      const cleanJson = jsonString.replace(/```json\n?|\n?```/g, '').trim();
      console.log('🤖 JSON limpio:', cleanJson);
      
      let parsed = JSON.parse(cleanJson);
      console.log('🤖 JSON parseado:', parsed);

      parsed.rawText = text;
      parsed.confidence = parsed.confidence || 0.8;
      
      console.log('🎯 Intent detectado:', parsed.intent);
      return parsed as DetectedIntent;

    } catch (err) {
      console.error('Error en IntentDetector:', err);
      // fallback mínimo por si falla
      return {
        intent: 'UNKNOWN',
        rawText: text,
        confidence: 0.1
      };
    }
  }

  /**
   * Detecta múltiples intenciones en un comando complejo
   */
  async detectMultiple(command: AssistantCommandDto): Promise<DetectedIntent[]> {
    const mainIntent = await this.detect(command);
    
    const intents = [mainIntent];
    
    if (mainIntent.extraIntents && mainIntent.extraIntents.length > 0) {
      intents.push(...mainIntent.extraIntents);
    }
    
    return intents;
  }
}
