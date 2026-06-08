import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export type RequestUser = {
  first_name: string;
  last_name: string;
  sub: string;
  email: string;
  roles: string[];
  provider: string;
  [key: string]: unknown;
};

declare global {
  namespace Express {
    interface Request {
      user: RequestUser;
    }
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'change_me'),
    });
  }

  async validate(claims: RequestUser) {
    return claims;
  }
}
