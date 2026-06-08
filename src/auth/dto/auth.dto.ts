import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/user/entities/user.entity';

export class AuthDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty({ type: User })
  user: User;
}
