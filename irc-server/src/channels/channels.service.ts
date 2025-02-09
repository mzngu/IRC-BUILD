import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Channel, ChannelDocument } from './schemas/channel.schema';

@Injectable()
export class ChannelsService {
  constructor(@InjectModel(Channel.name) private channelModel: Model<ChannelDocument>) { }

  async create(name: string): Promise<Channel> {
    const createdChannel = new this.channelModel({ name, users: [] });
    return createdChannel.save();
  }

  async findOne(name: string): Promise<Channel | null> {
    return this.channelModel.findOne({ name }).populate('users').exec();
  }

  async findAll(query?: string): Promise<Channel[]> {
    if (query) {
      return this.channelModel.find({ name: { $regex: query, $options: 'i' } }).populate('users').exec()
    }
    return this.channelModel.find().populate('users').exec();
  }

  async delete(name: string): Promise<{ deletedCount?: number }> {
    return this.channelModel.deleteOne({ name }).exec();
  }

  async addUserToChannel(channelName: string, userId: Types.ObjectId): Promise<Channel | null> {
    return this.channelModel.findOneAndUpdate(
      { name: channelName },
      { $push: { users: userId } },
      { new: true }
    ).exec();
  }

  async removeUserFromChannel(channelName: string, userId: Types.ObjectId): Promise<Channel | null> {
    return this.channelModel.findOneAndUpdate(
      { name: channelName },
      { $pull: { users: userId } },
      { new: true }
    ).exec();
  }
}