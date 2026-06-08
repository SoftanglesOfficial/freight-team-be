import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FavoriteService } from './favorite.service';
import { FavoriteController } from './favorite.controller';
import { Favorite, FavoriteSchema } from './entities/favorite.entity';
import { TrackFavoriteInterceptor } from './interceptors/track-favorite.interceptor';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: Favorite.name, schema: FavoriteSchema }])],
  controllers: [FavoriteController],
  providers: [FavoriteService, TrackFavoriteInterceptor],
  exports: [FavoriteService, TrackFavoriteInterceptor],
})
export class FavoriteModule {}
