import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';

@Injectable()
export class MessagesService {
  constructor(@InjectModel(Message.name) private messageModel: Model<MessageDocument>) {}

  async create(sender: string, content: string, room: string): Promise<Message> {
    const createdMessage = new this.messageModel({ sender, content, room });
    return createdMessage.save();
  }

    async findMessagesByRoom(room: string) {
        return this.messageModel.find({room}).populate('sender').exec()
    }
}