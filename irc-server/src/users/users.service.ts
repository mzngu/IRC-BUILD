import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

  async createUser(createUserDto: CreateUserDto): Promise<UserDocument> {
    const { username, email, password } = createUserDto;

    const existingUser = await this.userModel.findOne({ $or: [{ username }, { email }] });

    if (existingUser) {
      throw new HttpException('User with this username or email already exists', HttpStatus.CONFLICT);
    }

    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const createdUser = new this.userModel({
        _id: uuidv4(),
        username,
        email,
        passwordHash,
      });

      return createdUser.save();
    } catch (error) {
      console.error('Error saving user:', error.message, error.stack);
      throw new HttpException('Error creating user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async searchUsers(query: string): Promise<UserDocument[]> {
    if (!query || query.trim() === '') {
      return [];
    }
    return this.userModel
      .find({
        $or: [{ username: { $regex: query, $options: 'i' } }, { email: { $regex: query, $options: 'i' } }],
      })
      .exec();
  }

  async updateUser(username: string, updateUserDto: UpdateUserDto): Promise<UserDocument | null> {
    const filter = { username };
    return this.userModel.findOneAndUpdate(filter, updateUserDto, { new: true }).exec();
  }

  async findOne(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findById(id: Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async delete(username: string): Promise<{ deletedCount: number }> {
    try {
      return await this.userModel.deleteOne({ username }).exec();
    } catch (error) {
      console.error('Error during user deletion:', error);
      throw new HttpException('Error deleting user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateNickname(username: string, newNickname: string): Promise<UserDocument | null> {
    const filter = { username };
    return this.userModel.findOneAndUpdate(filter, { username: newNickname }, { new: true }).exec();
  }
}