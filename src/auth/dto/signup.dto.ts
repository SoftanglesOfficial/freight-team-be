import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Match } from 'src/common/decorators/match.decorator';

export class SignupDto {
  @ApiProperty({ default: 'John' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  first_name: string;

  @ApiProperty({ required: false, default: 'Doe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  last_name?: string;

  @ApiProperty({ default: 'user@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ default: 'password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ default: 'password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @Match('password')
  confirm_password: string;
}
