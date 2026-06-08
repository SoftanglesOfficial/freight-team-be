import { Controller, Body, Param, Req, Query, HttpStatus, HttpCode } from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { ToggleFavoriteDto } from './dto/toggle-favorite.dto';
import { BaseController } from 'src/common/base.controller';
import { Favorite } from './entities/favorite.entity';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';
import { PaginatedFavoritesDto } from './dto/paginated-favorites.dto';
import { ApiParam, ApiResponse } from '@nestjs/swagger';
import { ToggleFavoriteResponseDto } from './dto/toggle-favorite-response.dto';
import { Get, Post } from 'src/common/decorators/http.decorator';

@Controller('favorite')
export class FavoriteController extends BaseController {
  constructor(private readonly favoriteService: FavoriteService) {
    super();
  }

  @Post('/', { response: ToggleFavoriteResponseDto, status: HttpStatus.OK })
  async toggleFavorite(
    @Body() toggleFavoriteDto: ToggleFavoriteDto,
    @Req() req: Express.Request,
  ): Promise<ToggleFavoriteResponseDto> {
    return this.favoriteService.toggleFavorite(toggleFavoriteDto, req.user.sub);
  }

  @Get('/:type', { response: PaginatedFavoritesDto, status: HttpStatus.OK })
  async findAll(
    @Param('type') type: string,
    @Query() query: PaginationQuery,
    @Req() req: Express.Request,
  ): Promise<PaginatedFavoritesDto> {
    const [records, count] = await this.favoriteService.findAll(type, query, req.user.sub);
    return new PaginatedFavoritesDto(records, count, query);
  }

  @Get('/:type/:resourceId', { response: Favorite, status: HttpStatus.OK })
  findOne(
    @Param('type') type: string,
    @Param('resourceId') resourceId: string,
    @Req() req: Express.Request,
  ): Promise<Favorite> {
    return this.favoriteService.findOne(type, resourceId, req.user.sub);
  }
}
