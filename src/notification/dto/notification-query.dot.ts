import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';

export class NotificationQueryDto extends PaginationQuery {
  @ApiProperty({ type: Number, required: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  seen: boolean;
}
