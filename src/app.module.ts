import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { UserSecretModule } from './user-secret/user-secret.module';
import { GatewayModule } from './gateway/gateway.module';
import { ActivityModule } from './activity/activity.module';
import { NotificationModule } from './notification/notification.module';
import { MailerModule } from './mailer/mailer.module';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { QuoteRequestModule } from './quote-request/quote-request.module';
import { ChatModule } from './chat/chat.module';
import { FavoriteModule } from './favorite/favorite.module';
import { CommonModule } from './common/common.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import { ShipmentModule } from './shipment/shipment.module';
import { DocumentModule } from './document/document.module';
import { LiveChatModule } from './live-chat/live-chat.module';
import { RequestContextModule } from './request-context/request-context.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({ global: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/freight-team-nest-be',
        ),
        dbName: configService.get<string>('MONGODB_DB_NAME', 'roaspig-db'),
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASS', ''),
        },
      }),
    }),
    CommonModule,
    RequestContextModule,
    GatewayModule,
    MailerModule,
    UserModule,
    AuthModule,
    UserSecretModule,
    QuoteRequestModule,
    ChatModule,
    NotificationModule,
    ActivityModule,
    FavoriteModule,
    FileUploadModule,
    ShipmentModule,
    DocumentModule,
    LiveChatModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
