import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({
    description: 'Latitude of the current location',
    example: 34.0522,
  })
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  latitude: number;

  @ApiProperty({
    description: 'Longitude of the current location',
    example: -118.2437,
  })
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  longitude: number;

  @ApiProperty({
    description: 'Optional note for this location update',
    example: 'Arrived at distribution center',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}
