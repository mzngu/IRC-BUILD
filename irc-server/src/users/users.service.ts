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
    const { username, email, password } = createUserDto;

    const existingUser = await this.userModel.findOne({
      $or: [{ username }, { email },],
    });

    if (existingUser) {
      throw new HttpException(
        'User with this username, email  already exists',
        HttpStatus.CONFLICT,
      );
    }

    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const createdUser = new this.userModel({
        username,
        email,
        password: passwordHash,
      });

      return await createdUser.save();
    } 
    catch (error) {
        console.error('Error saving user:', error.message, error.stack);
        throw new HttpException(
          'Error creating user',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
  }

  async findOne(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async delete(username: string) {
    try {
      return await this.userModel.deleteOne({ username }).exec();
    } catch (error) {
      console.error("Error during user deletion:", error); 
      throw new HttpException(
        'Error deleting user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}