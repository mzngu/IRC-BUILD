import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseConfigModule } from './mongoose/mongoose.module';
import { UsersModule } from './users/users.module';
import { ChatGateway } from './chat/chat.gateway';
import { MessagesModule } from './messages/messages.module';
import { AuthModule } from './auth/auth.module'; 

@Module({
  imports: [MongooseConfigModule, UsersModule, MessagesModule, AuthModule], 
  controllers: [AppController],
  providers: [AppService, ChatGateway],
})
export class AppModule {}