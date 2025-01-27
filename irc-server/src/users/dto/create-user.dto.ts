import { IsString, IsEmail, IsPhoneNumber, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
  _id?: string;
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @IsEmail()
  @MaxLength(255) 
  email: string;

  @IsString()
  @MinLength(10)
  password: string;
}