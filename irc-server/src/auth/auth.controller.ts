import { Controller, Post, Body, ValidationPipe, UsePipes, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDto } from '../users/dto/login-user.dto';
import { CreateUserDto } from '../users/dto/create-user.dto'; 

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @UsePipes(new ValidationPipe())
  async register(@Body() createUserDto: CreateUserDto) {
    try {
      return await this.authService.register(createUserDto);
    } catch (error) {
        throw error
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK) 
  @UsePipes(new ValidationPipe())
  async login(@Body() loginUserDto: LoginUserDto) {
      try {
          return await this.authService.login(loginUserDto)
      } catch (error) {
          throw error
      }
  }
}