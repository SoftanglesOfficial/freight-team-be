import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ToBoolean } from 'src/common/transformers/types.transformer';

export class UpdateNotificationDto {
  @ApiProperty({ type: Boolean })
  @IsNotEmpty()
  @Transform(ToBoolean)
  seen: boolean;
}
