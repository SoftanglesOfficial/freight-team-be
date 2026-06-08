import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('FACEBOOK_CLIENT_ID', ''),
      clientSecret: configService.get<string>('FACEBOOK_CLIENT_SECRET', ''),
      callbackURL: configService.get<string>(
        'FACEBOOK_CALLBACK_URL',
        'http://localhost:3000/auth/facebook/redirect',
      ),
      scope: ['email'],
      profileFields: ['id', 'emails', 'name', 'displayName'],
    });
  }

  async validate(_: string, __: string, profile: Profile) {
    const firstName = profile.name?.givenName ?? profile.displayName ?? 'New';
    const lastName = profile.name?.familyName ?? '';
    const email = profile.emails?.[0]?.value;

    return {
      provider: 'facebook' as const,
      email,
      firstName,
      lastName,
    };
  }
}
