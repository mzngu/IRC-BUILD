import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { Types } from 'mongoose';

@Injectable()
export class MessagesService {
  constructor(@InjectModel(Message.name) private messageModel: Model<MessageDocument>) { }

  async create(sender: Types.ObjectId, content: string, room?: string, recipient?: Types.ObjectId): Promise<Message> {
    const createdMessage = new this.messageModel({ sender, content, room, recipient });
    return createdMessage.save();
  }

  async findMessagesByRoom(room: string): Promise<Message[]> {
    return this.messageModel.find({ room }).populate('sender').sort({ createdAt: 1 }).exec();
  }
  async findPrivateMessages(sender: Types.ObjectId, recipient: Types.ObjectId): Promise<Message[]> {
    return this.messageModel.find({
      $or: [
        { sender, recipient },
        { sender: recipient, recipient: sender },
      ],
    }).populate('sender').sort({ createdAt: 1 }).exec();
  }
  async update(id: string, content: string): Promise<Message | null> {
    return this.messageModel.findByIdAndUpdate(id, { content, edited: true }, { new: true }).exec();
  }

  async delete(id: string): Promise<{ deletedCount?: number }> {
    return this.messageModel.deleteOne({ _id: id }).exec();
  }
}