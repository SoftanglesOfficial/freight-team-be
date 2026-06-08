import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCustomerDto {
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

  @ApiProperty({ default: 'customer@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  company_name?: string;
}
