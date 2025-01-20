import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import * as bcrypt from 'bcrypt';
import { Server, Socket } from 'socket.io';
import { UsersService } from 'src/users/users.service';
import { MessagesService } from 'src/messages/messages.service';
import { Types } from 'mongoose';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private usersService: UsersService, private messagesService: MessagesService) {}

  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, {socket: Socket, username: string}> = new Map();

  async handleConnection(client: Socket) {
      const username = client.handshake.auth.username;
      const password = client.handshake.auth.password;

      if (!username || !password) {
          client.disconnect(true);
          throw new WsException('No credentials provided')
      }

      const user = await this.usersService.findOne(username);
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
          client.disconnect(true);
          throw new WsException('Invalid credentials')
      }

      console.log(`Client connected: ${client.id} - ${username}`);
      this.connectedClients.set(client.id, {socket: client, username});
      this.server.emit('userJoined', {userId: client.id, username});
  }

  handleDisconnect(client: Socket) {
      const user = this.connectedClients.get(client.id)
      console.log(`Client disconnected: ${client.id} - ${user?.username}`);
      this.connectedClients.delete(client.id);
      this.server.emit('userLeft', {userId: client.id, username: user?.username});

  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, room: string) {
      client.join(room);
      const messages = await this.messagesService.findMessagesByRoom(room)
      client.emit('previousMessages', messages)
  }

  @SubscribeMessage('message')
  async handleMessage(client: Socket, payload: { content: string, room: string }): Promise<void> {
      const user = this.connectedClients.get(client.id)
      if (!user) {
          return
      }
      const sender = await this.usersService.findOne(user.username)
      if (!sender) {
          return
      }
      const message = await this.messagesService.create(sender._id.toString(), payload.content, payload.room);
      this.server.to(payload.room).emit('message', {
          ...payload,
          sender: {
              username: sender.username,
              _id: sender._id.toString() 
          },
          createdAt: message.createdAt
      });
  }
}