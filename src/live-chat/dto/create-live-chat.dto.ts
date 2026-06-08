import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLiveChatDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  anon_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  user_name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsEmail()
  @IsOptional()
  user_email?: string;
}
