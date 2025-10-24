import type { Response } from 'express';

import type { ApiResponse, PaginationMeta } from '../../shared/interfaces';

/**
 * Clase para estandarizar todas las respuestas HTTP
 */
export class ResponseHandler {
  /**
   * Respuesta exitosa genérica
   */
  static success<T>(res: Response, data: T, message?: string, statusCode: number = 200): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      ...(message && { message }),
    };

    res.status(statusCode).json(response);
  }

  /**
   * Respuesta exitosa con paginación
   */
  static successWithPagination<T>(
    res: Response,
    data: T,
    meta: PaginationMeta,
    message?: string,
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta,
      ...(message && { message }),
    };

    res.status(200).json(response);
  }

  /**
   * Respuesta de creación exitosa (201)
   */
  static created<T>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully',
  ): void {
    this.success(res, data, message, 201);
  }

  /**
   * Respuesta sin contenido (204)
   */
  static noContent(res: Response): void {
    res.status(204).send();
  }

  /**
   * Respuesta de error genérica
   */
  static error<T>(res: Response, message: string, statusCode: number = 500, details?: T): void {
    const response: ApiResponse<T> = {
      success: false,
      error: message,
      ...(details && { details }),
    };

    res.status(statusCode).json(response);
  }

  /**
   * Bad Request (400)
   */
  static badRequest<T>(res: Response, message: string = 'Bad request', details?: T): void {
    this.error(res, message, 400, details);
  }

  /**
   * Unauthorized (401)
   */
  static unauthorized(res: Response, message: string = 'Unauthorized'): void {
    this.error(res, message, 401);
  }

  /**
   * Forbidden (403)
   */
  static forbidden(res: Response, message: string = 'Forbidden'): void {
    this.error(res, message, 403);
  }

  /**
   * Not Found (404)
   */
  static notFound(res: Response, resource: string = 'Resource'): void {
    this.error(res, `${resource} not found`, 404);
  }

  /**
   * Conflict (409)
   */
  static conflict(res: Response, message: string = 'Resource already exists'): void {
    this.error(res, message, 409);
  }

  /**
   * Unprocessable Entity (422)
   */
  static unprocessableEntity<T>(
    res: Response,
    message: string = 'Unprocessable entity',
    details?: T,
  ): void {
    this.error(res, message, 422, details);
  }

  /**
   * Too Many Requests (429)
   */
  static tooManyRequests(
    res: Response,
    message: string = 'Too many requests',
    retryAfter?: number,
  ): void {
    if (retryAfter) {
      res.setHeader('Retry-After', retryAfter);
    }
    this.error(res, message, 429);
  }

  /**
   * Internal Server Error (500)
   */
  static internalError<T>(
    res: Response,
    message: string = 'Internal server error',
    details?: T,
  ): void {
    this.error(res, message, 500, details);
  }

  /**
   * Service Unavailable (503)
   */
  static serviceUnavailable(res: Response, message: string = 'Service unavailable'): void {
    this.error(res, message, 503);
  }

  /**
   * Respuesta personalizada con headers adicionales
   */
  static customResponse<T>(
    res: Response,
    statusCode: number,
    data: T,
    headers?: Record<string, string>,
  ): void {
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }

    res.status(statusCode).json(data);
  }
}

// Export como singleton para consistencia
export const responseHandler = ResponseHandler;
