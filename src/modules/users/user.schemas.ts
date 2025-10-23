import { z } from 'zod';
import { commonSchemas } from '../../middlewares/validation.middleware';

// Schema para crear usuario
export const createUserSchema = z.object({
  email: commonSchemas.email,
  password: commonSchemas.password,
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  age: z.number().int().positive().min(18).optional(),
});

// Schema para actualizar usuario
export const updateUserSchema = z.object({
  email: commonSchemas.email.optional(),
  name: z.string().min(2).max(50).optional(),
  age: z.number().int().positive().min(18).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided'
);

// Schema para query params de paginación
export const paginationSchema = commonSchemas.pagination.extend({
  sortBy: z.enum(['createdAt', 'name', 'email']).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  // Filtros adicionales
  email: z.string().optional(),
  name: z.string().optional(),
});

// Schema para params con ID
export const userIdParamsSchema = commonSchemas.id;

// Tipos TypeScript inferidos
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type UserIdParams = z.infer<typeof userIdParamsSchema>;