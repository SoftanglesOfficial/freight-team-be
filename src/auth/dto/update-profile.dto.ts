import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty()
  first_name?: string;

  @ApiProperty()
  last_name?: string;
}
