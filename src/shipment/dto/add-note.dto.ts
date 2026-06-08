import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddNoteDto {
  @ApiProperty({
    description: 'The content of the note',
    example: 'Client requested an earlier delivery if possible.',
  })
  @IsNotEmpty()
  @IsString()
  note: string;
}
