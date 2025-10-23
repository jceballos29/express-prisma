import { z } from 'zod';
import { commonSchemas } from '../../middlewares/validation.middleware';

// Schema para login
export const loginSchema = z.object({
  email: commonSchemas.email,
  password: z.string().min(1, 'Password is required'),
});

// Schema para registro
export const registerSchema = z.object({
  email: commonSchemas.email,
  password: commonSchemas.password,
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
});

// Schema para cambiar contraseña
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: commonSchemas.password,
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

// Schema para refresh token
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Tipos inferidos
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;