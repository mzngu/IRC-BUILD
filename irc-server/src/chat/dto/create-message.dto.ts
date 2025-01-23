import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;

  @IsString()
  @IsNotEmpty()
  room: string;
}