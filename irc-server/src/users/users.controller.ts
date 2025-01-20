import { Controller, Post, Body, ValidationPipe, UsePipes, HttpException, HttpStatus } from '@nestjs/common';
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
}