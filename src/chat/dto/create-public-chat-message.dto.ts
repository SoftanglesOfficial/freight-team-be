import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePublicChatMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  content: string;

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
