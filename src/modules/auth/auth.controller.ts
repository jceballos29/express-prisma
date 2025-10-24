import type { NextFunction, Request, Response } from 'express';

import type { TypedRequest } from '@/shared/types/request';

import type { LoginInput, RefreshTokenInput, RegisterInput } from './auth.schemas';
import { AuthService } from './auth.service';
import type { ApiResponse, TokenResponse } from '../../shared/interfaces';
import type { UserResponseDto } from '../users';
import { UserRepository } from '../users/user.repository';

export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /auth/login
  login = async (
    req: TypedRequest<undefined, LoginInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const loginData = req.body;
      const result = await this.authService.login(loginData);

      const response: ApiResponse<{
        user: UserResponseDto;
        tokens: TokenResponse;
      }> = {
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
        message: 'Login successful',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // POST /auth/register
  register = async (
    req: TypedRequest<undefined, RegisterInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const registerData = req.body;
      const result = await this.authService.register(registerData);

      const response: ApiResponse<{
        user: UserResponseDto;
        tokens: TokenResponse;
      }> = {
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
        message: 'User registered successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  // POST /auth/refresh
  refreshToken = async (
    req: TypedRequest<undefined, RefreshTokenInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const tokens = await this.authService.refreshToken(refreshToken);

      const response: ApiResponse<TokenResponse> = {
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
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
        return;
      }

      const token = authHeader.substring(7);

      await this.authService.logout(token);

      const response: ApiResponse<null> = {
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
