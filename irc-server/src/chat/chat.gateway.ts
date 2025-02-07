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
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { sanitize } from 'src/utils/sanitize';
import { CreateMessageDto } from './dto/create-message.dto';
import { ChannelsService } from 'src/channels/channels.service';
import { AuthService } from 'src/auth/auth.service';
import { Message } from './interfaces/message.interface';

interface ConnectedUser { 
    userId: Types.ObjectId;
    username: string;
  }

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private usersService: UsersService,
        private messagesService: MessagesService,
        private channelsService: ChannelsService,
        private authService: AuthService,
    ) { }

    @WebSocketServer()
    server: Server;

    private connectedClients: Map<string, { socket: Socket; user: ConnectedUser }> = new Map();

    async handleConnection(client: Socket) {
        const token = client.handshake.auth.token;

        if (!token) {
            client.disconnect(true);
            return;
        }

        try {
            const payload = await this.authService.verifyToken(token);
            const userDocument = await this.usersService.findById(payload.sub);
            if (!userDocument) {
                client.disconnect(true);
                return;
            }

            const user: ConnectedUser = {  
                userId: userDocument._id,
                username: userDocument.username,
              };

            this.connectedClients.set(client.id, { socket: client, user });
            client.data.user = user;
            console.log(`Client connected: ${client.id} - ${user.username}`);
            this.server.emit('userJoined', { userId: client.id, username: user.username });
        } catch (error) {
            console.error('Connection error:', error);
            client.disconnect(true);
        }
    }

    handleDisconnect(client: Socket) {
        const user = this.connectedClients.get(client.id)?.user;
        if (user) {
            console.log(`Client disconnected: ${client.id} - ${user.username}`);
            this.connectedClients.delete(client.id);
            this.server.emit('userLeft', { userId: client.id, username: user.username });
        }
    }

    @SubscribeMessage('joinRoom')
    @UseGuards(WsJwtGuard)
    async handleJoinRoom(client: Socket, room: string) {
        const user = client.data.user;
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
    @UseGuards(WsJwtGuard)
    @UsePipes(new ValidationPipe())
    async handleMessage(client: Socket, createMessageDto: CreateMessageDto): Promise<void> { 
        const user = client.data.user;
        console.log('Received message:', createMessageDto);//test
        console.log('User:', user); //test
        const sender = await this.usersService.findOne(user.username); 

        if (!sender) {
            client.emit('messageError', 'Sender not found.');
            return;
        }

        try {
            const sanitizedContent = sanitize(createMessageDto.content);
            const message = await this.messagesService.create(sender._id, sanitizedContent, createMessageDto.room);
            this.server.to(createMessageDto.room).emit('message', {
                content: sanitizedContent,
                room: createMessageDto.room,
                sender: { username: sender.username, _id: sender._id.toString() },
                createdAt: message.createdAt,
            });
            console.log('Message saved:', message);//test
        } catch (error) {
            console.error('Error saving message:', error);
            client.emit('messageError', 'Could not send message.');
            client.emit('messageError', 'Could not save message');//test
        }
    }

    @SubscribeMessage('privateMessage')
    @UseGuards(WsJwtGuard)
    async handlePrivateMessage(client: Socket, payload: { content: string, recipientUsername: string }) { 
        const user = client.data.user; 
        const sender = await this.usersService.findOne(user.username);
        const recipient = await this.usersService.findOne(payload.recipientUsername);

        if (!sender || !recipient) {
            client.emit('privateMessageError', 'Invalid recipient.');
            return;
        }

        try {
            const message = await this.messagesService.create(sender._id, payload.content, undefined, recipient._id);
            client.emit('privateMessage', { ...payload, sender: { username: sender.username, _id: sender._id.toString() }, createdAt: message.createdAt });
            this.server.to(recipient._id.toString()).emit('privateMessage', { ...payload, sender: { username: sender.username, _id: sender._id.toString() }, createdAt: message.createdAt });

        } catch (error) {
            console.error('Error sending private message:', error);
            client.emit('privateMessageError', 'Could not send private message.');
        }
    }

    @SubscribeMessage('typing')
    @UseGuards(WsJwtGuard)
    handleTyping(client: Socket, data: { room: string, isTyping: boolean }) {
        const user = client.data.user; 
        client.to(data.room).emit('typing', { username: user.username, isTyping: data.isTyping });
    }
    @SubscribeMessage('editMessage')
    @UseGuards(WsJwtGuard)
    async handleEditMessage(client: Socket, payload: { messageId: string, content: string }) {
        const user = client.data.user;
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
    @UseGuards(WsJwtGuard)
    async handleDeleteMessage(client: Socket, messageId: string) { 
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
    @SubscribeMessage('list')
    @UseGuards(WsJwtGuard)
    async handleListChannels(client: Socket, query?: string) {
        try {
            const channels = await this.channelsService.findAll(query);
            client.emit('channelList', channels);
        } catch (error) {
            console.error("Error listing channels:", error);
            client.emit('channelListError', 'Could not retrieve channel list.');
        }
    }
    @SubscribeMessage('create')
    @UseGuards(WsJwtGuard)
    async handleCreateChannel(client: Socket, channelName: string) {
        try {
            const channel = await this.channelsService.create(channelName);
            this.server.emit('channelCreated', channel);
        } catch (error) {
            console.error("Error creating channel:", error);
            client.emit('channelCreateError', 'Could not create channel.');
        }
    }
    @SubscribeMessage('delete')
    @UseGuards(WsJwtGuard)
    async handleDeleteChannel(client: Socket, channelName: string) {
        try {
            await this.channelsService.delete(channelName);
            this.server.emit('channelDeleted', channelName);
        } catch (error) {
            console.error("Error deleting channel:", error);
            client.emit('channelDeleteError', 'Could not delete channel.');
        }
    }
    @SubscribeMessage('join')
    @UseGuards(WsJwtGuard)
    async handleJoinChannel(client: Socket, channelName: string, user: { userId: Types.ObjectId, username: string }) {
        try {
            const channel = await this.channelsService.findOne(channelName)
            if (!channel) {
                client.emit('joinError', 'Channel not found')
                return
            }
            await this.channelsService.addUserToChannel(channelName, user.userId)
            client.join(channelName)
            client.emit('joinSuccess', channel)
            this.server.to(channelName).emit('userJoinedChannel', { username: user.username })
        } catch (error) {
            console.error("Error joining channel:", error);
            client.emit('joinError', 'Could not join channel.');
        }
    }
    @SubscribeMessage('quit')
    @UseGuards(WsJwtGuard)
    async handleQuitChannel(client: Socket, channelName: string, user: { userId: Types.ObjectId, username: string }) {
        try {
            const channel = await this.channelsService.findOne(channelName)
            if (!channel) {
                client.emit('quitError', 'Channel not found')
                return
            }
            await this.channelsService.removeUserFromChannel(channelName, user.userId)
            client.leave(channelName)
            client.emit('quitSuccess', channel)
            this.server.to(channelName).emit('userLeftChannel', { username: user.username })

        } catch (error) {
            console.error("Error quitting channel:", error);
            client.emit('quitError', 'Could not quit channel.');
        }
    }
    @SubscribeMessage('users')
    @UseGuards(WsJwtGuard)
    async handleListUsersInChannel(client: Socket, channelName: string) {
        try {
            const channel = await this.channelsService.findOne(channelName)
            if (!channel) {
                client.emit('usersError', 'Channel not found')
                return
            }
            client.emit('usersList', channel.users.map(user => user.toString()))
        } catch (error) {
            console.error("Error listing users in channel:", error);
            client.emit('usersError', 'Could not retrieve users list.');
        }
    }
    @SubscribeMessage('nick')
    async handleNickChange(client: Socket, newNickname: string, user: { userId: Types.ObjectId, username: string }) {
        try {
            const existingUserWithNickname = await this.usersService.findOne(newNickname)
            if (existingUserWithNickname && existingUserWithNickname._id.toString() !== user.userId.toString()) {
                client.emit('nickError', 'Nickname already taken.');
                return;
            }
            const updatedUser = await this.usersService.updateNickname(user.username, newNickname);
            if (!updatedUser) {
                client.emit('nickError', 'Could not update nickname.');
                return;
            }

            user.username = newNickname

            for (const room of client.rooms) {
                if (room !== client.id) {
                    this.server.to(room).emit('userNickChanged', { oldNickname: user.username, newNickname });
                }
            }

            client.emit('nickSuccess', newNickname);
        } catch (error) {
            console.error('Error changing nickname:', error);
            client.emit('nickError', 'Could not change nickname.');
        }
    }
}

