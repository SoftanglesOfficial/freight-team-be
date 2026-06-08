import { ApiProperty } from '@nestjs/swagger';

export class Message {
  @ApiProperty()
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}
