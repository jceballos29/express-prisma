import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../shared/interfaces';
import { UserRepository } from '../users/user.repository';
import { AuthService } from './auth.service';

export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /auth/login
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const loginData = req.body;
      const result = await this.authService.login(loginData);

      const response: ApiResponse = {
        success: true,
        data: {
          user: result.user,
          ...result.tokens,
        },
        message: 'Login successful',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // POST /auth/register
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const registerData = req.body;
      const result = await this.authService.register(registerData);

      const response: ApiResponse = {
        success: true,
        data: {
          user: result.user,
          ...result.tokens,
        },
        message: 'User registered successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  // POST /auth/refresh
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const tokens = await this.authService.refreshToken(refreshToken);

      const response: ApiResponse = {
        success: true,
        data: tokens,
        message: 'Token refreshed successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // POST /auth/logout
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Aquí podrías invalidar el token guardándolo en una blacklist en Redis
      // TODO: Implementar blacklist de tokens

      const response: ApiResponse = {
        success: true,
        message: 'Logout successful',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}

// Singleton instance
export const authController = new AuthController(new AuthService(new UserRepository()));