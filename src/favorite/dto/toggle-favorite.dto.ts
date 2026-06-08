import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class ToggleFavoriteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  resource_type: string;

  @ApiProperty({ type: String })
  @IsMongoId()
  @IsNotEmpty()
  resource_id: string;
}
