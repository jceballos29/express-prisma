import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodObject } from 'zod';
import { logger } from '../shared/utils';


// Tipo para especificar dónde validar
type ValidationSource = 'body' | 'query' | 'params';

/**
 * Middleware genérico de validación con Zod
 * @param schema - Schema de Zod para validar
 * @param source - Dónde buscar los datos (body, query, params)
 */
export function validate(schema: ZodObject, source: ValidationSource = 'body') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Obtener datos según la fuente
      const dataToValidate = req[source];

      // Validar con Zod
      const validated = await schema.parseAsync(dataToValidate);

      // Reemplazar los datos originales con los validados (type assertion para params)
      if (source === 'params' || source === 'query') {
        req[source] = validated as any;
      } else {
        req[source] = validated;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Formatear errores de Zod
        const formattedErrors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn({
          path: req.path,
          method: req.method,
          errors: formattedErrors,
        }, 'Validation error');

        return res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors,
        });
      }

      logger.error({ err: error }, 'Unexpected validation error');

      return res.status(500).json({
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
      const errors: any[] = [];

      // Validar body
      if (schemas.body) {
        try {
          req.body = await schemas.body.parseAsync(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...error.issues.map(err => ({
              source: 'body',
              field: err.path.join('.'),
              message: err.message,
            })));
          }
        }
      }

      // Validar query
      if (schemas.query) {
        try {
          req.query = await schemas.query.parseAsync(req.query) as any;
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...error.issues.map(err => ({
              source: 'query',
              field: err.path.join('.'),
              message: err.message,
            })));
          }
        }
      }

      // Validar params (con type assertion)
      if (schemas.params) {
        try {
          const validatedParams = await schemas.params.parseAsync(req.params);
          req.params = validatedParams as any;
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...error.issues.map(err => ({
              source: 'params',
              field: err.path.join('.'),
              message: err.message,
            })));
          }
        }
      }

      // Si hay errores, retornar
      if (errors.length > 0) {
        logger.warn({
          path: req.path,
          method: req.method,
          errors,
        }, 'Multiple validation errors');

        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }

      next();
    } catch (error) {
      logger.error({ err: error }, 'Unexpected validation error');

      return res.status(500).json({
        error: 'Internal server error during validation',
      });
    }
  };
}

// Schemas de validación comunes
export const commonSchemas = {
  // ID numérico
  id: z.object({
    id: z.coerce.number().int().positive(),
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