import { ApiProperty, PickType } from '@nestjs/swagger';
import { SignupDto } from './signup.dto';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordDto extends PickType(SignupDto, [
  'email',
  'password',
  'confirm_password',
]) {
  @ApiProperty({ default: 'password' })
  @IsString()
  @IsNotEmpty()
  secret: string;
}
