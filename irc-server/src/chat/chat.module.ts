import { forwardRef, Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { UsersModule } from '../users/users.module';
import { MessagesModule } from '../messages/messages.module';
import { ChannelsModule } from '../channels/channels.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    forwardRef(() => UsersModule), 
    MessagesModule,
    ChannelsModule,
    forwardRef(() => AuthModule), 
  ],
  providers: [ChatGateway],
})
export class ChatModule {}