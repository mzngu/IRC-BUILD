import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;
}