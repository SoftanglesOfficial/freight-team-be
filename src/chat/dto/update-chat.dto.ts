import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateChatDto {
  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  name?: string;
}
