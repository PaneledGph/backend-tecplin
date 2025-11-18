import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface TechnicalDocument {
  id: number;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}

export interface RAGResponse {
  answer: string;
  usedDocs: string[];
  confidence: number;
  category?: string;
}

@Injectable()
export class RAGService {
  private genAI: GoogleGenerativeAI;

  constructor(private readonly prisma: PrismaService) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  /**
   * Genera embedding de un texto usando Gemini
   */
  async embedText(text: string): Promise<number[]> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: "text-embedding-004",
      });

      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generando embedding:', error);
      // Fallback: devolver vector vacío
      return new Array(768).fill(0);
    }
  }

  /**
   * Inserta un documento técnico con su embedding
   */
  async insertTechnicalDocument(title: string, content: string, category?: string): Promise<any> {
    try {
      const embedding = await this.embedText(content);

      // Por ahora guardamos en una tabla simple, luego migraremos a pgvector
      return await this.prisma.$executeRaw`
        INSERT INTO technical_docs (title, content, category, embedding_text)
        VALUES (${title}, ${content}, ${category || 'general'}, ${content})
      `;
    } catch (error) {
      console.error('Error insertando documento:', error);
      throw error;
    }
  }

  /**
   * Busca documentos relevantes usando similitud semántica
   */
  async search(query: string, limit: number = 5): Promise<TechnicalDocument[]> {
    try {
      // Por ahora usamos búsqueda por texto, luego migraremos a búsqueda vectorial
      const docs = await this.prisma.$queryRaw<TechnicalDocument[]>`
        SELECT id, title, content, category
        FROM technical_docs
        WHERE content ILIKE ${'%' + query + '%'}
           OR title ILIKE ${'%' + query + '%'}
        ORDER BY 
          CASE 
            WHEN title ILIKE ${'%' + query + '%'} THEN 1
            ELSE 2
          END,
          LENGTH(content) DESC
        LIMIT ${limit}
      `;

      return docs || [];
    } catch (error) {
      console.error('Error en búsqueda:', error);
      return [];
    }
  }

  /**
   * Genera respuesta técnica usando RAG
   */
  async answer(query: string): Promise<RAGResponse> {
    try {
      const docs = await this.search(query);
      const context = docs.map(d => `${d.title}: ${d.content}`).join('\n\n');

      if (!context.trim()) {
        return {
          answer: "No encontré información específica sobre esa consulta en nuestros manuales técnicos.",
          usedDocs: [],
          confidence: 0.1
        };
      }

      const prompt = `
Eres un especialista técnico de TECPLIN con amplia experiencia en sistemas eléctricos.
Usa únicamente el contexto proporcionado para responder.

Contexto técnico:
${context}

Pregunta:
${query}

Instrucciones:
- Da una respuesta técnica precisa, concisa y profesional
- Usa términos técnicos apropiados
- Si la información no es suficiente, dilo explícitamente
- Incluye pasos específicos cuando sea relevante
- Menciona consideraciones de seguridad si aplica

Respuesta:
      `;

      // Intentar con diferentes modelos disponibles
      let model;
      try {
        model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      } catch (error) {
        console.log('⚠️ gemini-1.5-pro no disponible en RAG, usando gemini-pro...');
        model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      }
      const result = await model.generateContent(prompt);

      return {
        answer: result.response.text(),
        usedDocs: docs.map(d => d.title),
        confidence: docs.length > 0 ? 0.8 : 0.3,
        category: docs[0]?.category || 'general'
      };

    } catch (error) {
      console.error('Error generando respuesta RAG:', error);
      return {
        answer: "Ocurrió un error al procesar tu consulta técnica. Por favor, intenta de nuevo.",
        usedDocs: [],
        confidence: 0.1
      };
    }
  }

  /**
   * Diagnóstico técnico especializado
   */
  async technicalDiagnosis(problem: string, context?: any): Promise<RAGResponse> {
    const enhancedQuery = `diagnóstico problema técnico: ${problem}`;
    
    if (context?.equipmentType) {
      enhancedQuery.concat(` equipo: ${context.equipmentType}`);
    }
    
    return this.answer(enhancedQuery);
  }

  /**
   * Busca procedimientos específicos
   */
  async getProcedure(procedure: string): Promise<RAGResponse> {
    const query = `procedimiento ${procedure} pasos instrucciones`;
    return this.answer(query);
  }

  /**
   * Busca información sobre materiales/repuestos
   */
  async getMaterialInfo(material: string): Promise<RAGResponse> {
    const query = `material repuesto ${material} especificaciones uso`;
    return this.answer(query);
  }
}
