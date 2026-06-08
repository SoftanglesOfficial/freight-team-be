import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { ToBoolean } from 'src/common/transformers/types.transformer';

export class UpdateLiveChatDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(ToBoolean)
  is_archived?: boolean;
}
