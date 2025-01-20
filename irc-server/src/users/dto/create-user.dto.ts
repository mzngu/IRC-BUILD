import { IsString, IsEmail, IsPhoneNumber, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsEmail()
  email: string;

  @IsPhoneNumber('FR') 
  phoneNumber: string;

  @IsString()
  @MinLength(6)
  password: string;
}