import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseConfigModule } from './mongoose/mongoose.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [MongooseConfigModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}