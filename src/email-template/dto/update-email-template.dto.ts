import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class EmailBlockDto {
  @ApiProperty({ enum: ['paragraph', 'heading', 'list'] })
  @IsIn(['paragraph', 'heading', 'list'])
  type: 'paragraph' | 'heading' | 'list';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  items?: string[];
}

export class UpdateEmailTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ type: [EmailBlockDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailBlockDto)
  blocks: EmailBlockDto[];
}
