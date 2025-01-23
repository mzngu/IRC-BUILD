import {
    WebSocketGateway,
    SubscribeMessage,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsersService } from 'src/users/users.service';
import { MessagesService } from 'src/messages/messages.service';
import { Types } from 'mongoose';
import { UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'; // Correct import
import { WsGuard } from 'src/auth/guards/ws.guard';
import { JwtService } from '@nestjs/jwt';
import { sanitize } from 'src/utils/sanitize';
import { CreateMessageDto } from './dto/create-message.dto';
@WebSocketGateway({ cors: { origin: '*' } })
@UseGuards(WsGuard) 
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(private usersService: UsersService, private messagesService: MessagesService, private jwtService: JwtService) {}

    @WebSocketServer()
    server: Server;

    private connectedClients: Map<string, {socket: Socket, user: {userId: Types.ObjectId, username: string}}> = new Map();

    handleConnection(client: Socket, user: {userId: Types.ObjectId, username: string}) {
        console.log(`Client connected: ${client.id} - ${user.username}`);
        this.connectedClients.set(client.id, {socket: client, user});
        this.server.emit('userJoined', {userId: client.id, username: user.username});
    }

    handleDisconnect(client: Socket) {
        const user = this.connectedClients.get(client.id)
        console.log(`Client disconnected: ${client.id} - ${user?.user.username}`);
        this.connectedClients.delete(client.id);
        this.server.emit('userLeft', {userId: client.id, username: user?.user.username});

    }

    @SubscribeMessage('joinRoom')
    async handleJoinRoom(client: Socket, room: string, user: {userId: Types.ObjectId, username: string}) {
        client.join(room);
        try {
            const messages = await this.messagesService.findMessagesByRoom(room);
            client.emit('previousMessages', messages);
        } catch (error) {
            console.error("Error fetching previous messages:", error);
            client.emit('previousMessagesError', 'Could not retrieve message history.');
        }
    }

    @SubscribeMessage('message')
    @UsePipes(new ValidationPipe())
    async handleMessage(client: Socket, createMessageDto: CreateMessageDto, user: {userId: Types.ObjectId, username: string}): Promise<void> {
        const sender = await this.usersService.findOne(user.username)
        if (!sender) {
            return
        }
        try {
            const sanitizedContent = sanitize(createMessageDto.content);
            const message = await this.messagesService.create(sender._id, sanitizedContent, createMessageDto.room);
            this.server.to(createMessageDto.room).emit('message', {
                content: sanitizedContent,
                room: createMessageDto.room,
                sender: {
                    username: sender.username,
                    _id: sender._id.toString()
                },
                createdAt: message.createdAt
            });
        } catch (error) {
            console.error("Error saving message:", error);
            client.emit('messageError', 'Could not send message.');
        }
    }
}

