import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: true })
export class NotificacionesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<number, string>();

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      this.userSockets.set(userId, client.id);
      console.log(`✅ Usuario ${userId} conectado via WebSocket`);
    } catch (error) {
      // Token expirado o inválido - desconectar silenciosamente
      if (error.name === 'TokenExpiredError') {
        console.log('⚠️ Token expirado en WebSocket - cliente desconectado');
      } else if (error.name === 'JsonWebTokenError') {
        console.log('⚠️ Token inválido en WebSocket - cliente desconectado');
      } else {
        console.error('❌ Error en conexión WebSocket:', error.message);
      }
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        console.log(`❌ Usuario ${userId} desconectado`);
        break;
      }
    }
  }

  notifyUser(userId: number, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', data);
    }
  }

  broadcastOrdenActualizada(ordenId: number, data: any) {
    this.server.emit('orden:actualizada', { ordenId, ...data });
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    return { event: 'pong', data: { timestamp: Date.now() } };
  }
}
