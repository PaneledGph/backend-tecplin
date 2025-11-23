import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  // Crear o obtener conversación
  @Post('conversations')
  @ApiOperation({ summary: 'Crear o obtener conversación entre dos usuarios' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId1: { type: 'number', example: 1 },
        userId2: { type: 'number', example: 2 },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Conversación creada o encontrada' })
  async createConversation(@Body() body: { userId1: number; userId2: number }) {
    return this.chatService.createConversation(body.userId1, body.userId2);
  }

  // Obtener conversaciones del usuario
  @Get('conversations/user/:userId')
  async getUserConversations(@Param('userId') userId: string) {
    return this.chatService.getUserConversations(parseInt(userId));
  }

  // Enviar mensaje
  @Post('messages')
  async sendMessage(
    @Body()
    body: {
      conversacionId: number;
      remitenteId: number;
      contenido: string;
    },
  ) {
    return this.chatService.sendMessage(
      body.conversacionId,
      body.remitenteId,
      body.contenido,
    );
  }

  // Obtener mensajes de una conversación
  @Get('messages/:conversacionId')
  async getMessages(
    @Param('conversacionId') conversacionId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.chatService.getMessages(
      parseInt(conversacionId),
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  // Marcar mensajes como leídos
  @Post('messages/read')
  async markAsRead(@Body() body: { conversacionId: number; userId: number }) {
    return this.chatService.markAsRead(body.conversacionId, body.userId);
  }

  // Obtener contador de no leídos
  @Get('unread/:userId')
  async getUnreadCount(@Param('userId') userId: string) {
    const count = await this.chatService.getUnreadCount(parseInt(userId));
    return { count };
  }

  // Obtener técnicos y admins disponibles
  @Get('staff')
  @ApiOperation({
    summary: 'Obtener lista de técnicos y admins disponibles para chat',
  })
  @ApiResponse({ status: 200, description: 'Lista de staff disponible' })
  async getAvailableStaff() {
    return this.chatService.getAvailableStaff();
  }

  // Crear conversación para una orden específica
  @Post('conversation/order')
  @ApiOperation({
    summary: 'Crear conversación entre cliente y técnico para una orden',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        clienteUserId: { type: 'number', example: 1 },
        tecnicoUserId: { type: 'number', example: 2 },
        ordenId: { type: 'number', example: 1 },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Conversación creada para la orden',
  })
  async createConversationForOrder(
    @Body()
    body: {
      clienteUserId: number;
      tecnicoUserId: number;
      ordenId: number;
    },
  ) {
    return this.chatService.createConversationForOrder(
      body.clienteUserId,
      body.tecnicoUserId,
      body.ordenId,
    );
  }

  // Obtener conversación por orden
  @Get('conversation/order/:ordenId')
  @ApiOperation({ summary: 'Obtener conversación asociada a una orden' })
  @ApiParam({ name: 'ordenId', type: 'number', description: 'ID de la orden' })
  @ApiResponse({ status: 200, description: 'Conversación encontrada' })
  @ApiResponse({
    status: 404,
    description: 'No hay conversación para esta orden',
  })
  async getConversationByOrder(@Param('ordenId') ordenId: string) {
    return this.chatService.getConversationByOrder(parseInt(ordenId));
  }
}
