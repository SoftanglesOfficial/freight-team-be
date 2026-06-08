import { ApiProperty } from '@nestjs/swagger';

export class ToggleFavoriteResponseDto {
  @ApiProperty({ type: Boolean })
  is_favorite: boolean;

  @ApiProperty({ type: String })
  resource_id: string;

  @ApiProperty()
  resource_type: string;
}
