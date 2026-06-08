/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { applyDecorators, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import {
  Get as NestGet,
  Post as NestPost,
  Put as NestPut,
  Delete as NestDelete,
  Patch as NestPatch,
} from '@nestjs/common';

type ResponseType = (() => Function | [Function] | Function[]) | Function | [Function] | Function[];

/**
 * Extended GET decorator
 *
 * Recommended:
 * @Get({ path: 'profile', response: AuthDto, status: HttpStatus.OK })
 *
 * Alternatives:
 * @Get('path', { response: AuthDto, status: HttpStatus.OK, isArray: false })
 * @Get('path', AuthDto, HttpStatus.OK, false)
 * @Get('path', AuthDto)
 */
export const Get = (
  path: string | string[],
  config: {
    response: ResponseType;
    status: HttpStatus;
    isArray?: boolean;
    description?: string;
  },
) => {
  const { response, status, isArray, description } = config || {
    response: undefined,
    status: HttpStatus.NO_CONTENT,
  };
  return applyDecorators(
    NestGet(path),
    HttpCode(status),
    ApiResponse({
      status,
      type: response as any,
      ...(isArray !== undefined && { isArray }),
      ...(description && { description }),
    }),
  );
};

/**
 * Extended POST decorator
 *
 * Recommended:
 * @Post({ path: 'signup', response: AuthDto, status: HttpStatus.CREATED })
 *
 * Alternatives:
 * @Post('path', { response: AuthDto, status: HttpStatus.CREATED })
 * @Post('path', AuthDto, HttpStatus.CREATED)
 * @Post('path', AuthDto)
 */
export const Post = (
  path: string | string[],
  config: {
    response: ResponseType;
    status: HttpStatus;
    isArray?: boolean;
    description?: string;
  },
) => {
  const { response, status, isArray, description } = config || {
    response: undefined,
    status: HttpStatus.NO_CONTENT,
  };
  return applyDecorators(
    NestPost(path),
    HttpCode(status),
    ApiResponse({
      status,
      type: response as any,
      ...(isArray !== undefined && { isArray }),
      ...(description && { description }),
    }),
  );
};

/**
 * Extended PUT decorator
 *
 * @Put('path', { response: () => UserDto, status: HttpStatus.OK })
 * @Put('path', () => UserDto, HttpStatus.OK)
 */
export const Put = (
  path: string | string[],
  config: {
    response: ResponseType;
    status: HttpStatus;
    isArray?: boolean;
    description?: string;
  },
) => {
  const { response, status, isArray, description } = config || {
    response: undefined,
    status: HttpStatus.NO_CONTENT,
  };
  return applyDecorators(
    NestPut(path),
    HttpCode(status),
    ApiResponse({
      status,
      type: response as any,
      ...(isArray !== undefined && { isArray }),
      ...(description && { description }),
    }),
  );
};

/**
 * Extended PATCH decorator
 *
 * @Patch('path', { response: () => UserDto, status: HttpStatus.OK })
 * @Patch('path', () => UserDto, HttpStatus.OK)
 */
export const Patch = (
  path: string | string[],
  config: {
    response: ResponseType;
    status: HttpStatus;
    isArray?: boolean;
    description?: string;
  },
) => {
  const { response, status, isArray, description } = config || {
    response: undefined,
    status: HttpStatus.NO_CONTENT,
  };
  return applyDecorators(
    NestPatch(path),
    HttpCode(status),
    ApiResponse({
      status,
      type: response as any,
      ...(isArray !== undefined && { isArray }),
      ...(description && { description }),
    }),
  );
};

/**
 * Extended DELETE decorator
 *
 * @Delete('path', { response: () => MessageDto, status: HttpStatus.OK })
 * @Delete('path', () => MessageDto, HttpStatus.OK)
 */
export const Delete = (
  path: string | string[],
  config: {
    response: ResponseType;
    status: HttpStatus;
    isArray?: boolean;
    description?: string;
  },
) => {
  const { response, status, isArray, description } = config || {
    response: undefined,
    status: HttpStatus.NO_CONTENT,
  };
  return applyDecorators(
    NestDelete(path),
    HttpCode(status),
    ApiResponse({
      status,
      type: response as any,
      ...(isArray !== undefined && { isArray }),
      ...(description && { description }),
    }),
  );
};
