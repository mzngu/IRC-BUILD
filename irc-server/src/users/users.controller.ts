import {
  Controller,
  Post,
  Get,
  Param,
  NotFoundException,
  Delete,
  Body,
  ValidationPipe,
  UsePipes,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './schemas/user.schema';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) { }

  @Post()
  @UsePipes(new ValidationPipe())
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    try {
      return await this.usersService.createUser(createUserDto);
    } catch (error) {
      console.error('Error in UsersController create method:', error.message, error.stack);

      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error creating user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto) {
    try {
      const user = await this.usersService.findOne(loginUserDto.username);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isMatch = await bcrypt.compare(loginUserDto.password, user.passwordHash);

      if (!isMatch) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = { username: user.username, sub: user._id };
      return {
        access_token: await this.jwtService.signAsync(payload),
      };
    } catch (error) {
      console.error('Error in UsersController login method:', error.message, error.stack);
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException('Error during login', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get(':username')
  async findOne(@Param('username') username: string): Promise<User> {
    try {
      const user = await this.usersService.findOne(username);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      console.error('Error in UsersController findOne method:', error.message, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error finding user', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Delete(':username')
  async deleteUser(@Param('username') username: string) {
    try {
      const result = await this.usersService.delete(username)
      if (result.deletedCount === 0) {
        throw new NotFoundException('User not found')
      }
      return { message: 'User deleted successfully' };
    } catch (error) {
      console.error('Error in UsersController delete method:', error.message, error.stack);
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException('Error deleting user', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
  @Patch(':username')
  async updateUser(@Param('username') username: string, @Body() updateUserDto: UpdateUserDto) {
    try {
      const user = await this.usersService.updateUser(username, updateUserDto)
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user
    } catch (error) {
      console.error('Error in UsersController update method:', error.message, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error updating user', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}