import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { username, email, phoneNumber, password } = createUserDto;

    const existingUser = await this.userModel.findOne({ $or: [{ username }, { email }, { phoneNumber }] });
    if (existingUser) {
      throw new HttpException('User with this username, email or phone already exists', HttpStatus.CONFLICT);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const createdUser = new this.userModel({ username, email, phoneNumber, passwordHash });
    try {
        return await createdUser.save();
    } catch (error) {
        throw new HttpException('Error creating user', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async findOne(username: string): Promise<User | undefined> {
    return this.userModel.findOne({ username }).exec();
  }
}