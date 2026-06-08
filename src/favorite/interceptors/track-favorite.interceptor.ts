import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { FavoriteService } from '../favorite.service';
import { Favorite } from '../entities/favorite.entity';
import { Request } from 'express';

interface EntityWithId {
  _id?: string | { toString(): string };
  id?: string;
  toObject?(): any;
}

interface PaginatedResponse {
  records?: EntityWithId[];
  data?: EntityWithId[];
}
@Injectable()
export class TrackFavoriteInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    @Inject(FavoriteService) private favoriteService: FavoriteService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const trackFavoriteArgs = this.reflector.get<string[]>('track-favorite', context.getHandler());

    if (!trackFavoriteArgs || trackFavoriteArgs.length === 0) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user || !user.id) {
      return next.handle();
    }

    return next.handle().pipe(
      map(async (data: unknown) => {
        if (!data) return data;

        // Handle single entity
        if (this.hasId(data)) {
          return await this.addIsFavoriteToEntity(data, user.sub, trackFavoriteArgs[0]);
        }

        // Handle array of entities
        if (Array.isArray(data)) {
          return await Promise.all(
            data.map((entity: unknown) =>
              this.hasId(entity)
                ? this.addIsFavoriteToEntity(entity, user.sub, trackFavoriteArgs[0])
                : entity,
            ),
          );
        }

        // Handle paginated response with 'records' property (like PaginatedServicesDto)
        if (this.isPaginatedWithRecords(data)) {
          data.records = await Promise.all(
            data.records.map((entity: EntityWithId) =>
              this.addIsFavoriteToEntity(entity, user.sub, trackFavoriteArgs[0]),
            ),
          );
          return data;
        }

        // Handle paginated response with 'data' property (generic pagination)
        if (this.isPaginatedWithData(data)) {
          data.data = await Promise.all(
            data.data.map((entity: EntityWithId) =>
              this.addIsFavoriteToEntity(entity, user.sub, trackFavoriteArgs[0]),
            ),
          );
          return data;
        }

        return data;
      }),
    );
  }

  private hasId(data: unknown): data is EntityWithId {
    return data != null && typeof data === 'object' && ('_id' in data || 'id' in data);
  }

  private isPaginatedWithRecords(
    data: unknown,
  ): data is PaginatedResponse & { records: EntityWithId[] } {
    if (data == null || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return 'records' in obj && Array.isArray(obj.records);
  }

  private isPaginatedWithData(data: unknown): data is PaginatedResponse & { data: EntityWithId[] } {
    if (data == null || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return 'data' in obj && Array.isArray(obj.data);
  }

  private async addIsFavoriteToEntity(
    entity: EntityWithId,
    userId: string,
    resourceType: string,
  ): Promise<EntityWithId & { is_favorite: boolean }> {
    if (!entity || !entity._id) return entity as EntityWithId & { is_favorite: boolean };
    let favorite: Favorite | null = null;
    try {
      const entityId = typeof entity._id === 'string' ? entity._id : entity._id.toString();
      favorite = await this.favoriteService.findOneByUserAndResource(
        userId,
        entityId,
        resourceType,
      );
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
    const entityObj = entity.toObject
      ? (entity.toObject() as Record<string, unknown>)
      : (entity as Record<string, unknown>);
    return { ...entityObj, is_favorite: !!favorite };
  }
}
