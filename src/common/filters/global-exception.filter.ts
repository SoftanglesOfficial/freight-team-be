import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { MongoServerError } from 'mongodb';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const { message, errors } = this.normalizeHttpException(exceptionResponse);

      return response.status(status).json({
        statusCode: status,
        message,
        ...(errors ? { errors } : {}),
      });
    }

    if (exception instanceof MongoServerError && exception.code === 11000) {
      const field = this.getDuplicateField(exception);
      const friendlyMessage = field
        ? `A record with this ${this.humanizeField(field)} already exists. Please use a different value.`
        : 'This record already exists. Please check for duplicate values and try again.';

      this.logger.warn(`Duplicate key error: ${exception.message}`);

      return response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: friendlyMessage,
      });
    }

    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error('Unknown exception', String(exception));
    }

    const message =
      exception instanceof Error && process.env.NODE_ENV !== 'production'
        ? exception.message
        : 'An unexpected error occurred. Please try again or contact support if the problem continues.';

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
    });
  }

  private normalizeHttpException(
    exceptionResponse: string | object,
  ): { message: string; errors?: Record<string, string> } {
    if (typeof exceptionResponse === 'string') {
      return { message: exceptionResponse };
    }

    const body = exceptionResponse as Record<string, unknown>;
    const rawMessage = body.message;

    if (Array.isArray(rawMessage)) {
      const errors: Record<string, string> = {};
      const lines: string[] = [];

      rawMessage.forEach((entry) => {
        if (typeof entry !== 'string') return;
        const match = entry.match(/^([^\s]+)\s+(.+)$/);
        if (match) {
          const field = match[1];
          const text = this.capitalize(match[2].split(',')[0].trim());
          errors[field] = text;
          lines.push(`${this.humanizeField(field)}: ${text}`);
        } else {
          lines.push(this.capitalize(entry));
        }
      });

      return {
        message: lines.length ? lines.join('; ') : 'Validation failed',
        errors: Object.keys(errors).length ? errors : undefined,
      };
    }

    if (typeof rawMessage === 'string') {
      return { message: rawMessage };
    }

    return { message: 'Request failed' };
  }

  private getDuplicateField(error: MongoServerError): string | null {
    const keyValue = error.keyValue as Record<string, unknown> | undefined;
    if (keyValue) {
      return Object.keys(keyValue)[0] ?? null;
    }

    const match = error.message.match(/index:\s+(\w+)/);
    return match?.[1] ?? null;
  }

  private humanizeField(field: string): string {
    const labels: Record<string, string> = {
      proNumber: 'PRO number',
      ftlWareHouseId: 'FTL Warehouse ID',
      email: 'email address',
    };

    return labels[field] ?? field.replace(/_/g, ' ');
  }

  private capitalize(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
