import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserSecretType } from '../user-secret.service';

export class CreateUserSecretDto {
  @ApiProperty({ default: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ default: 'reset-password' })
  @IsString()
  @IsNotEmpty()
  intent: string;

  @ApiProperty({ default: UserSecretType.OTP })
  @IsEnum(UserSecretType)
  @IsNotEmpty()
  type: UserSecretType;
}
