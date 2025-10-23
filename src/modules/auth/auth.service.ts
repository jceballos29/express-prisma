import bcrypt from 'bcrypt';
import { generateRefreshToken, generateToken } from '../../middlewares/auth.middleware';
import {
  ConflictError,
  UnauthorizedError
} from '../../shared/errors/app.error';
import { TokenResponse } from '../../shared/interfaces';
import { logger, loggerHelpers } from '../../shared/utils';
import { UserRepository } from '../users/user.repository';
import { UserResponseDto } from '../users/user.types';
import { LoginInput, RegisterInput } from './auth.schemas';

export class AuthService {
  constructor(private userRepository: UserRepository) { }

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

      // Por ahora, asumimos que es válido para demostración
      // TODO: Implementar bcrypt

      // Generar tokens
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: 'user', // Obtener del usuario cuando esté en el schema
      });

      const refreshToken = generateRefreshToken({
        id: user.id,
        email: user.email,
      });

      loggerHelpers.logAuth('login_success', user.id, true);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        tokens: {
          token,
          refreshToken,
          expiresIn: '7d',
        },
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

      // Hashear password
      // const hashedPassword = await bcrypt.hash(data.password, 10);
      // TODO: Implementar bcrypt

      // Crear usuario
      const user = await this.userRepository.create({
        email: data.email,
        name: data.name,
        password: data.password, // Debería ser hashedPassword
      });

      // Generar tokens
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: 'user',
      });

      const refreshToken = generateRefreshToken({
        id: user.id,
        email: user.email,
      });

      loggerHelpers.logAuth('register_success', user.id, true);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        tokens: {
          token,
          refreshToken,
          expiresIn: '7d',
        },
      };
    } catch (error) {
      logger.error({ err: error, email: data.email }, 'Error in AuthService.register');
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      // Aquí deberías verificar el refresh token
      // const decoded = jwt.verify(refreshToken, config.jwt.secret);
      // const user = await this.userRepository.findById(decoded.id);

      // Por ahora, retornamos un token de ejemplo
      // TODO: Implementar lógica completa de refresh token

      throw new Error('Refresh token not implemented yet');
    } catch (error) {
      logger.error({ err: error }, 'Error in AuthService.refreshToken');
      throw new UnauthorizedError('Invalid refresh token');
    }
  }
}

// Singleton instance
export const authService = new AuthService(new UserRepository());