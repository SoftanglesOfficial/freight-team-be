import { ApiProperty } from '@nestjs/swagger';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ToBoolean } from 'src/common/transformers/types.transformer';
import { Role } from 'src/roles/roles.decorator';

export class UserQueryDto extends PaginationQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(ToBoolean)
  is_active?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  search?: string;

  @ApiProperty({ enum: Role, enumName: 'Role', required: false })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
