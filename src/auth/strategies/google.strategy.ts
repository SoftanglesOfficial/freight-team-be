import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID', ''),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET', ''),
      callbackURL: configService.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:3000/auth/google/redirect',
      ),
      scope: ['email', 'profile'],
    });
  }

  async validate(_: string, __: string, profile: Profile) {
    const firstName = profile.name?.givenName ?? profile.displayName ?? 'New';
    const lastName = profile.name?.familyName ?? '';
    const email = profile.emails?.[0]?.value;

    return {
      provider: 'google' as const,
      email,
      firstName,
      lastName,
    };
  }
}
