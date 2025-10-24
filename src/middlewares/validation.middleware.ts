import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { ZodObject, ZodRawShape } from 'zod';

import { logger } from '../shared/utils';

type ValidationSource = 'body' | 'query' | 'params';

/**
 * Middleware genérico de validación con Zod
 * Tipado completo: infiere correctamente el tipo validado
 */
export function validate<T extends ZodObject<ZodRawShape>, S extends ValidationSource = 'body'>(
  schema: T,
  source: S = 'body' as S,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dataToValidate = req[source];
      const validated = await schema.parseAsync(dataToValidate);

      // Asignar de forma segura según la fuente
      Object.assign(req[source], validated);

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        logger.warn(
          {
            path: req.path,
            method: req.method,
            errors: formattedErrors,
          },
          'Validation error',
        );

        res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors,
        });
        return;
      }

      logger.error({ err: error }, 'Unexpected validation error');
      res.status(500).json({
        error: 'Internal server error during validation',
      });
    }
  };
}

/**
 * Middleware para validar múltiples fuentes a la vez
 */
export function validateMultiple(schemas: {
  body?: ZodObject;
  query?: ZodObject;
  params?: ZodObject;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: {
        source: ValidationSource;
        field: string;
        message: string;
      }[] = [];

      // Validar body
      if (schemas.body) {
        try {
          const validated = await schemas.body.parseAsync(req.body);
          Object.assign(req.body, validated);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(
              ...error.issues.map((err) => ({
                source: 'body' as ValidationSource,
                field: err.path.join('.'),
                message: err.message,
              })),
            );
          }
        }
      }

      // Validar query
      if (schemas.query) {
        try {
          const validated = await schemas.query.parseAsync(req.query);
          Object.assign(req.query, validated);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(
              ...error.issues.map((err) => ({
                source: 'query' as ValidationSource,
                field: err.path.join('.'),
                message: err.message,
              })),
            );
          }
        }
      }

      // Validar params (con type assertion)
      if (schemas.params) {
        try {
          const validated = await schemas.params.parseAsync(req.params);
          Object.assign(req.params, validated);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(
              ...error.issues.map((err) => ({
                source: 'params' as ValidationSource,
                field: err.path.join('.'),
                message: err.message,
              })),
            );
          }
        }
      }

      // Si hay errores, retornar
      if (errors.length > 0) {
        logger.warn(
          {
            path: req.path,
            method: req.method,
            errors,
          },
          'Multiple validation errors',
        );

        res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error({ err: error }, 'Unexpected validation error');

      res.status(500).json({
        error: 'Internal server error during validation',
      });
    }
  };
}

// Schemas de validación comunes
export const commonSchemas = {
  // ID numérico
  id: z.object({
    id: z.uuid(),
  }),

  // Paginación
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
  }),

  // Email
  email: z.email('Invalid email format'),

  // Password seguro
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  // UUID
  uuid: z.uuid(),

  // Date
  date: z.coerce.date(),
};
