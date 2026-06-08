import { SetMetadata, UseInterceptors } from '@nestjs/common';
import { TrackFavoriteInterceptor } from '../interceptors/track-favorite.interceptor';

export const TrackFavorite = (...args: string[]) => {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata('track-favorite', args)(target, propertyKey, descriptor);
    UseInterceptors(TrackFavoriteInterceptor)(target, propertyKey, descriptor);
  };
};
