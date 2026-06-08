import { PartialType } from '@nestjs/swagger';
import { CreateDocumentDto } from './create-document.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @ApiProperty({
    description: 'The internal ID in format sh-0000000',
    example: 'sh-0000123',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^sh-\d{7}$/, { message: 'Internal ID must be in format sh-0000000' })
  internal_id?: string;
}
