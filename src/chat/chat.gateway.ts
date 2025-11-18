import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { UseGuards } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<number, string>(); // userId -> socketId

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
    // Remover usuario de la lista
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('register')
  handleRegister(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.userSockets.set(data.userId, client.id);
    console.log(`Usuario ${data.userId} registrado con socket ${client.id}`);
    return { success: true };
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody()
    data: {
      conversacionId: number;
      remitenteId: number;
      contenido: string;
      destinatarioId: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log('📨 Recibiendo mensaje:', data);
      
      // Guardar mensaje en BD
      const mensaje = await this.chatService.sendMessage(
        data.conversacionId,
        data.remitenteId,
        data.contenido,
      );

      console.log('✅ Mensaje guardado:', mensaje);

      // Crear payload para emitir
      const payload = {
        conversacionId: data.conversacionId,
        mensaje: mensaje,
      };

      // Enviar al remitente (confirmación)
      client.emit('newMessage', payload);
      console.log('📤 Mensaje enviado al remitente');

      // Enviar al destinatario si está conectado
      const destinatarioSocketId = this.userSockets.get(data.destinatarioId);
      if (destinatarioSocketId) {
        this.server.to(destinatarioSocketId).emit('newMessage', payload);
        console.log('📤 Mensaje enviado al destinatario:', data.destinatarioId);
      } else {
        console.log('⚠️ Destinatario no conectado:', data.destinatarioId);
      }

      return { success: true, mensaje };
    } catch (error) {
      console.error('❌ Error al enviar mensaje:', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody()
    data: { conversacionId: number; userId: number; destinatarioId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const destinatarioSocketId = this.userSockets.get(data.destinatarioId);
    if (destinatarioSocketId) {
      this.server.to(destinatarioSocketId).emit('userTyping', {
        conversacionId: data.conversacionId,
        userId: data.userId,
      });
    }
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @MessageBody()
    data: { conversacionId: number; userId: number; destinatarioId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const destinatarioSocketId = this.userSockets.get(data.destinatarioId);
    if (destinatarioSocketId) {
      this.server.to(destinatarioSocketId).emit('userStoppedTyping', {
        conversacionId: data.conversacionId,
        userId: data.userId,
      });
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: { conversacionId: number; userId: number },
  ) {
    try {
      await this.chatService.markAsRead(data.conversacionId, data.userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Método para enviar notificación de nuevo mensaje
  notifyNewMessage(userId: number, mensaje: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('newMessage', mensaje);
    }
  }
}
