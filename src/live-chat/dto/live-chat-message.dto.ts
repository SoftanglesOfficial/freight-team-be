import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LiveChatMessageForAdminDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sender_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  chat_id: string;
}

export class LiveChatMessageForUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  chat_id: string;
}
