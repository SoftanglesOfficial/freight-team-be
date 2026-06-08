import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { ToggleFavoriteDto } from './dto/toggle-favorite.dto';
import { Favorite } from './entities/favorite.entity';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';
import { ToggleFavoriteResponseDto } from './dto/toggle-favorite-response.dto';

@Injectable()
export class FavoriteService {
  constructor(@InjectModel(Favorite.name) private favoriteModel: Model<Favorite>) {}

  async toggleFavorite(
    toggleFavoriteDto: ToggleFavoriteDto,
    userId: string,
  ): Promise<ToggleFavoriteResponseDto> {
    let isFavorite = false;
    let favorite = await this.favoriteModel.findOne({
      resource_type: toggleFavoriteDto.resource_type,
      resource: new Types.ObjectId(toggleFavoriteDto.resource_id),
      user_id: new Types.ObjectId(userId),
    });
    if (favorite) {
      await this.favoriteModel.deleteOne({ _id: favorite._id });
      isFavorite = false;
    } else {
      favorite = await this.favoriteModel.create({
        resource_type: toggleFavoriteDto.resource_type,
        resource: new Types.ObjectId(toggleFavoriteDto.resource_id),
        user_id: new Types.ObjectId(userId),
      });
      isFavorite = true;
    }
    return {
      is_favorite: isFavorite,
      resource_id: toggleFavoriteDto.resource_id,
      resource_type: toggleFavoriteDto.resource_type,
    };
  }

  async findAll(
    resourceType: string,
    query: PaginationQuery,
    userId: string,
  ): Promise<[Favorite[], number]> {
    const filter: FilterQuery<Favorite> = {
      resource_type: resourceType,
      user_id: new Types.ObjectId(userId),
    };
    const records = await this.favoriteModel
      .find(filter)
      .populate('resource')
      .sort({ createdAt: -1 })
      .skip(query.skip)
      .limit(query.pageSize)
      .exec();
    const count = await this.favoriteModel.countDocuments(filter).exec();
    return [
      records.map((record) => {
        const json = record.toObject();
        json.resource['is_favorite'] = true;
        return json;
      }),
      count,
    ];
  }

  async findOne(resourceType: string, resourceId: string, userId: string): Promise<Favorite> {
    return this.favoriteModel
      .findOne({
        resource_type: resourceType,
        resource: new Types.ObjectId(resourceId),
        user_id: new Types.ObjectId(userId),
      })
      .populate('resource')
      .orFail(new NotFoundException('Favorite not found'));
  }

  async findAllByUserAndResource(userId: string, resourceType: string): Promise<Favorite[]> {
    return this.favoriteModel
      .find({ user_id: new Types.ObjectId(userId), resource_type: resourceType })
      .exec();
  }

  async findOneByUserAndResource(
    userId: string,
    resourceId: string,
    resourceType: string,
  ): Promise<Favorite | null> {
    return this.favoriteModel
      .findOne({
        user_id: new Types.ObjectId(userId),
        resource: new Types.ObjectId(resourceId),
        resource_type: resourceType,
      })
      .exec();
  }
}
