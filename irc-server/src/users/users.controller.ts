import { Controller, Post, Get, Param, NotFoundException, Delete, Body, ValidationPipe, UsePipes, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './schemas/user.schema';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    @UsePipes(new ValidationPipe())
    async create(@Body() createUserDto: CreateUserDto): Promise<User> {
        try {
            return await this.usersService.createUser(createUserDto);
        } catch (error) {
            if(error instanceof HttpException){
                throw error
            }
            throw new HttpException('Error creating user', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
    @Get(':username')
  async findOne(@Param('username') username: string): Promise<User> {
    const user = await this.usersService.findOne(username);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
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
            if (error instanceof HttpException) {
                throw error
            }
            throw new HttpException('Error deleting user', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
}