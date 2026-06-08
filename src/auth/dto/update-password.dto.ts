import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from 'src/common/decorators/match.decorator';

export class UpdatePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  old_password: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  new_password: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Match('new_password')
  confirm_password: string;
}
