import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import type { LoginInput, RegisterInput } from './auth.schemas';
import { config } from '../../config';
import { cacheService } from '../../infrastructure';
import { generateRefreshToken, generateToken } from '../../middlewares/auth.middleware';
import { ConflictError, UnauthorizedError } from '../../shared/errors/app.error';
import type { TokenResponse } from '../../shared/interfaces';
import { logger, loggerHelpers } from '../../shared/utils';
import { UserRepository } from '../users/user.repository';
import type { User, UserResponseDto } from '../users/user.types';

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private cache = cacheService,
  ) {}

  async login(data: LoginInput): Promise<{ user: UserResponseDto; tokens: TokenResponse }> {
    try {
      // Buscar usuario por email
      const user = await this.userRepository.findByEmail(data.email);

      if (!user) {
        loggerHelpers.logAuth('login_failed', undefined, false);
        throw new UnauthorizedError('Invalid credentials');
      }

      // Aquí deberías verificar el password con bcrypt
      const isValidPassword = await bcrypt.compare(data.password, user.password);
      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Generar tokens
      const tokens = await this.generateTokens(user);
      const decoded = jwt.verify(tokens.token, config.jwt.secret) as jwt.JwtPayload;
      await cacheService.set(
        `token:${decoded.jti}`,
        { userId: user.id },
        config.jwt.expiresIn as number,
      );

      loggerHelpers.logAuth('login_success', user.id, true);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
        tokens: tokens,
      };
    } catch (error) {
      logger.error({ err: error, email: data.email }, 'Error in AuthService.login');
      throw error;
    }
  }

  async register(data: RegisterInput): Promise<{ user: UserResponseDto; tokens: TokenResponse }> {
    try {
      // Verificar que el email no exista
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Crear usuario
      const user = await this.userRepository.create({
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role ?? 'User',
      });

      // Generar tokens
      const tokens = await this.generateTokens(user);

      loggerHelpers.logAuth('register_success', user.id, true);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
        tokens: tokens,
      };
    } catch (error) {
      logger.error({ err: error, email: data.email }, 'Error in AuthService.register');
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      // Aquí deberías verificar el refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      let user;
      if (typeof decoded === 'object' && 'id' in decoded) {
        user = await this.userRepository.findById((decoded as jwt.JwtPayload).id);
      } else {
        throw new UnauthorizedError('Invalid refresh token payload');
      }
      if (!user) {
        loggerHelpers.logAuth('login_failed', undefined, false);
        throw new UnauthorizedError('Invalid credentials');
      }

      const key = `refreshToken:${user.id}`;
      const storedRefreshToken = await this.cache.get<string>(key);

      if (storedRefreshToken !== refreshToken) {
        loggerHelpers.logAuth('refresh_token_invalid', user.id, false);
        throw new UnauthorizedError('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);

      loggerHelpers.logAuth('token_generated', user.id, true);

      return tokens;
    } catch (error) {
      logger.error({ err: error }, 'Error in AuthService.refreshToken');
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async logout(token: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload;
      let user;
      if (typeof decoded === 'object' && 'id' in decoded) {
        user = await this.userRepository.findById((decoded as jwt.JwtPayload).id);
      } else {
        throw new UnauthorizedError('Invalid refresh token payload');
      }
      if (!user) {
        loggerHelpers.logAuth('login_failed', undefined, false);
        throw new UnauthorizedError('Invalid credentials');
      }

      await this.cache.del(`token:${decoded.jti}`);
      await this.cache.del(`refreshToken:${user.id}`);
    } catch (error) {
      logger.error({ err: error }, 'Error in AuthService.logout');
      throw error;
    }
  }

  private async generateTokens(user: User): Promise<TokenResponse> {
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role ?? 'User', // Obtener del usuario cuando esté en el schema
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role ?? 'User',
    });

    const key = `refreshToken:${user.id}`;

    await this.cache.set(key, refreshToken, config.jwt.refreshExpiresIn as number);

    return {
      token,
      refreshToken,
      expiresIn: config.jwt.expiresIn as string,
    };
  }
}

// Singleton instance
export const authService = new AuthService(new UserRepository());
