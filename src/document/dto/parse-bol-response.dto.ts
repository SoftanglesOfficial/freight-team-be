import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ParsedBolDataDto {
  @ApiPropertyOptional({ example: '90210' })
  shipper_zip?: string;

  @ApiPropertyOptional({ example: '10001' })
  consignee_zip?: string;

  @ApiPropertyOptional({ example: 'XPO Logistics' })
  carrier_name?: string;

  @ApiPropertyOptional({ example: '123456789' })
  pro_number?: string;

  @ApiPropertyOptional({ example: 'Call before delivery' })
  special_instructions?: string;

  @ApiPropertyOptional({ example: 'Acme Warehouse' })
  consignee_name?: string;

  @ApiPropertyOptional({ example: '2026-06-15' })
  pickup_date?: string;

  @ApiPropertyOptional({ example: '1200' })
  weight?: string;
}

export class ParseBolResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional({ type: ParsedBolDataDto })
  data?: ParsedBolDataDto;

  @ApiPropertyOptional()
  error?: string;
}
