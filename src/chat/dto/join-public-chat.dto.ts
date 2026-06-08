import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinPublicChatDto {
  @ApiProperty({ description: 'Name of the public chat room' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  room_name: string;

  @ApiProperty({ description: 'Anonymous user identifier', required: false })
  @IsOptional()
  @IsString()
  anonymous_user_id?: string;

  @ApiProperty({ description: 'Display name for anonymous user', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  display_name?: string;
}
