import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(UnprocessableEntityException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: UnprocessableEntityException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as Record<string, unknown>;

    // Check if the error is a validation error
    if (Array.isArray(exceptionResponse.message)) {
      const validationErrors = this.formatValidationErrors(exceptionResponse.message as string[]);
      return response.status(status).json({
        statusCode: status,
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    // If it's not a validation error, return the original error
    return response.status(status).json({
      statusCode: status,
      message: exceptionResponse.message,
    });
  }

  private formatValidationErrors(errors: string[]): Record<string, string> {
    const formattedErrors: Record<string, string> = {};

    errors.forEach((error) => {
      // Extract property name and error message
      const match = error.match(/^([a-zA-Z]+):\s*(.+)$/);
      if (match) {
        const property = match[1];
        // Get only the first error message and capitalize its first letter
        const message = match[2].split(',')[0].trim();
        formattedErrors[property] = this.capitalizeFirstLetter(message);
      } else {
        // If no property name found, use a generic key
        formattedErrors['error'] = this.capitalizeFirstLetter(error);
      }
    });

    return formattedErrors;
  }

  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}
