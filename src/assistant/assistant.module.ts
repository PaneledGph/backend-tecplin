import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller';
import { AssistantAdvancedController } from './assistant-advanced.controller';
import { AssistantGeminiController } from './assistant-gemini.controller';
import { TechnicianStatusController } from './technician-status.controller';
import { AssistantService } from './assistant.service';
import { AssistantEnhancedService } from './assistant-enhanced.service';
import { IntentDetectorService } from './intent-detector.service';
import { RAGService } from './rag.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssistantLearningService } from './assistant-learning.service';
import { AssistantHandlersService } from './assistant-handlers.service';
import { AssistantActionsService } from './assistant-actions.service';
import { AssistantMLService } from './assistant-ml.service';
import { AssistantIntelligenceService } from './assistant-intelligence.service';
import { ConversationFlowService } from './conversation-flow.service';
import { TechnicianAssignmentService } from './technician-assignment.service';
import { NotificacionesModule } from 'src/notificaciones/notificaciones.module';

@Module({
  imports: [PrismaModule, NotificacionesModule],
  controllers: [
    AssistantController, 
    AssistantAdvancedController,
    AssistantGeminiController,
    TechnicianStatusController
  ],
  providers: [
    AssistantService,
    AssistantEnhancedService,
    IntentDetectorService,
    RAGService,
    ConversationFlowService,
    TechnicianAssignmentService,
    AssistantLearningService,
    AssistantHandlersService,
    AssistantActionsService,
    AssistantMLService,
    AssistantIntelligenceService,
    PrismaService,
  ],
  exports: [
    AssistantLearningService,
    AssistantService,
    AssistantEnhancedService,
    IntentDetectorService,
    RAGService,
    ConversationFlowService,
    TechnicianAssignmentService,
    AssistantActionsService,
    AssistantMLService,
    AssistantIntelligenceService,
  ],
})
export class AssistantModule {}
