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
import { ChannelsService } from 'src/channels/channels.service';

@WebSocketGateway({ cors: { origin: '*' } })
@UseGuards(WsGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(private usersService: UsersService, private messagesService: MessagesService, private jwtService: JwtService, private channelsService: ChannelsService) { }

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
    async handlePrivateMessage(client: Socket, payload: { content: string, recipientUsername: string }, user: {userId: Types.ObjectId, username: string}) {
        const sender = await this.usersService.findOne(user.username);
        const recipient = await this.usersService.findOne(payload.recipientUsername);

        if (!sender || !recipient) {
            client.emit('privateMessageError', 'Invalid recipient.');
            return;
        }

        try {
            const message = await this.messagesService.create(sender._id, payload.content, undefined, recipient._id);
            client.emit('privateMessage', { ...payload, sender: {username: sender.username, _id: sender._id.toString()}, createdAt: message.createdAt });
            this.server.to(recipient._id.toString()).emit('privateMessage', { ...payload, sender: {username: sender.username, _id: sender._id.toString()}, createdAt: message.createdAt });

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
    @SubscribeMessage('list')
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
    async handleJoinChannel(client: Socket, channelName: string, user: {userId: Types.ObjectId, username: string}) {
        try {
            const channel = await this.channelsService.findOne(channelName)
            if (!channel) {
                client.emit('joinError', 'Channel not found')
                return
            }
            await this.channelsService.addUserToChannel(channelName, user.userId)
            client.join(channelName)
            client.emit('joinSuccess', channel)
            this.server.to(channelName).emit('userJoinedChannel', {username: user.username})
        } catch (error) {
            console.error("Error joining channel:", error);
            client.emit('joinError', 'Could not join channel.');
        }
    }
    @SubscribeMessage('quit')
    async handleQuitChannel(client: Socket, channelName: string, user: {userId: Types.ObjectId, username: string}) {
        try {
            const channel = await this.channelsService.findOne(channelName)
            if (!channel) {
                client.emit('quitError', 'Channel not found')
                return
            }
            await this.channelsService.removeUserFromChannel(channelName, user.userId)
            client.leave(channelName)
            client.emit('quitSuccess', channel)
            this.server.to(channelName).emit('userLeftChannel', {username: user.username})

        } catch (error) {
            console.error("Error quitting channel:", error);
            client.emit('quitError', 'Could not quit channel.');
        }
    }
    @SubscribeMessage('users')
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
    async handleNickChange(client: Socket, newNickname: string, user: {userId: Types.ObjectId, username: string}) {
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

