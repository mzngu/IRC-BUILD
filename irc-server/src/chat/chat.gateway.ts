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
import { UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { WsGuard } from 'src/auth/guards/ws.guard';
import { JwtService } from '@nestjs/jwt';
import { sanitize } from 'src/utils/sanitize';
import { CreateMessageDto } from './dto/create-message.dto';
@WebSocketGateway({ cors: { origin: '*' } })
@UseGuards(WsGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(private usersService: UsersService, private messagesService: MessagesService, private jwtService: JwtService) { }

    @WebSocketServer()
    server: Server;

    private connectedClients: Map<string, { socket: Socket, user: { userId: Types.ObjectId, username: string } }> = new Map();

    handleConnection(client: Socket, user: { userId: Types.ObjectId, username: string }) {
        console.log(`Client connected: ${client.id} - ${user.username}`);
        this.connectedClients.set(client.id, { socket: client, user });
        this.server.emit('userJoined', { userId: client.id, username: user.username });
    }

    handleDisconnect(client: Socket) {
        const user = this.connectedClients.get(client.id)
        console.log(`Client disconnected: ${client.id} - ${user?.user.username}`);
        this.connectedClients.delete(client.id);
        this.server.emit('userLeft', { userId: client.id, username: user?.user.username });

    }

    @SubscribeMessage('joinRoom')
    async handleJoinRoom(client: Socket, room: string, user: { userId: Types.ObjectId, username: string }) {
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
    async handleMessage(client: Socket, createMessageDto: CreateMessageDto, user: { userId: Types.ObjectId, username: string }): Promise<void> {
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

    @SubscribeMessage('privateMessage')
    async handlePrivateMessage(client: Socket, payload: { content: string, recipientUsername: string }, user: { userId: Types.ObjectId, username: string }) {
        const sender = await this.usersService.findOne(user.username);
        const recipient = await this.usersService.findOne(payload.recipientUsername);

        if (!sender || !recipient) {
            client.emit('privateMessageError', 'Invalid recipient.');
            return;
        }

        try {
            const message = await this.messagesService.create(sender._id, payload.content, undefined, recipient._id);
            client.emit('privateMessage', { ...payload, sender: { username: sender.username, _id: sender._id }, createdAt: message.createdAt });
            this.server.to(recipient._id.toString()).emit('privateMessage', { ...payload, sender: { username: sender.username, _id: sender._id }, createdAt: message.createdAt });
        } catch (error) {
            console.error('Error sending private message:', error);
            client.emit('privateMessageError', 'Could not send private message.');
        }
    }

    @SubscribeMessage('typing')
    handleTyping(client: Socket, data: { room: string, isTyping: boolean }, user: { userId: Types.ObjectId, username: string }) {
        client.to(data.room).emit('typing', { username: user.username, isTyping: data.isTyping });
    }
    @SubscribeMessage('editMessage')
    async handleEditMessage(client: Socket, payload: { messageId: string, content: string }, user: { userId: Types.ObjectId, username: string }) {
        try {
            const updatedMessage = await this.messagesService.update(payload.messageId, payload.content);
            if (updatedMessage) {
                this.server.to(updatedMessage.room).emit('messageUpdated', updatedMessage);
            }
        } catch (error) {
            console.error("Error editing message:", error);
            client.emit('messageEditError', 'Could not edit the message.');
        }
    }
    @SubscribeMessage('deleteMessage')
    async handleDeleteMessage(client: Socket, messageId: string, user: { userId: Types.ObjectId, username: string }) {
        try {
            const result = await this.messagesService.delete(messageId);
            if (result.deletedCount) {
                this.server.emit('messageDeleted', messageId);
            }
        } catch (error) {
            console.error("Error deleting message:", error);
            client.emit('messageDeleteError', 'Could not delete the message.');
        }
    }
}

