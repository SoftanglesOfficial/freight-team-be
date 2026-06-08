import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { Match } from 'src/common/decorators/match.decorator';

export class MakeUserPasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  new_password: string;

  @ApiProperty()
  @IsNotEmpty()
  @Match('new_password')
  confirm_password: string;
}
