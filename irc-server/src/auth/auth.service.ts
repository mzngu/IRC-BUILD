import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from '../users/schemas/user.schema'; 
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from '../users/dto/login-user.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user: UserDocument | null = await this.usersService.findOne(username);
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async register(createUserDto: CreateUserDto): Promise<{ access_token: string }> {
    try {
      const user: UserDocument = await this.usersService.createUser(createUserDto); 
      const payload = { username: user.username, sub: user._id.toString() };
      const token = await this.jwtService.signAsync(payload);
      return { access_token: token };
    } catch (error) {
      if (error.code === 11000 && error.keyPattern && error.keyPattern.username === 1) {
        throw new HttpException('Username already exists', HttpStatus.CONFLICT);
      } else if (error.code === 11000 && error.keyPattern && error.keyPattern.email === 1) {
        throw new HttpException('Email already exists', HttpStatus.CONFLICT);
      } else if (error instanceof HttpException) { 
          throw error;
      }
      console.error("Registration Error:", error)
      throw new HttpException(error.message || 'Registration failed', HttpStatus.BAD_REQUEST); 
    }
  }

  async login(loginUserDto: LoginUserDto): Promise<{ access_token: string }> { 
    const user: UserDocument | null = await this.usersService.findOne(loginUserDto.username);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(loginUserDto.password, user.passwordHash);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { username: user.username, sub: user._id.toString() };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}