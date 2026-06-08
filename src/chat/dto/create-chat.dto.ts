import { IsArray, IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';
import { ChatType } from '../entities/chat.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChatDto {
  @ApiProperty({ type: String, isArray: true })
  @IsArray()
  @IsNotEmpty()
  @IsMongoId({ each: true })
  members: Types.ObjectId[];

  @ApiProperty({ enum: ChatType, enumName: 'ChatType' })
  @IsNotEmpty()
  @IsEnum(ChatType)
  type: ChatType;
}
