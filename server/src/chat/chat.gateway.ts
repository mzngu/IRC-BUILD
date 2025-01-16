import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: true })
export class ChatGateway {
  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const token = client.handshake.query.token;
    try {
      const payload = this.jwtService.verify(token); 
      client.data.user = payload;
    } catch (err) {
      client.disconnect();
    }
  }
}
@SubscribeMessage('joinRoom')
handleJoinRoom(client: Socket, room: string) {
  client.join(room);
  this.server.to(room).emit('message', { sender: 'System', message: `${client.id} joined the room.` });
}

@SubscribeMessage('leaveRoom')
handleLeaveRoom(client: Socket, room: string) {
  client.leave(room);
  this.server.to(room).emit('message', { sender: 'System', message: `${client.id} left the room.` });
}
@SubscribeMessage('privateMessage')
handlePrivateMessage(client: Socket, data: { recipientId: string; message: string }) {
  const recipientSocket = this.server.sockets.sockets.get(data.recipientId);
  if (recipientSocket) {
    recipientSocket.emit('privateMessage', { senderId: client.id, message: data.message });
  }
}
