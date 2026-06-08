import { ApiProperty } from '@nestjs/swagger';

export class MessageUrlDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  url: string;

  constructor(message: string, url: string) {
    this.message = message;
    this.url = url;
  }
}
