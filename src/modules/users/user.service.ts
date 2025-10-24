import { UserRepository } from './user.repository';
import type {
  User,
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
  UserFilters,
} from './user.types';
import { cacheService } from '../../infrastructure';
import { NotFoundError, ConflictError, BadRequestError } from '../../shared/errors/app.error';
import type { PaginationQuery, PaginationMeta } from '../../shared/interfaces';
import { logger } from '../../shared/utils';

export class UserService {
  constructor(
    private userRepository: UserRepository,
    private cache = cacheService,
  ) {}

  // Convertir User a UserResponseDto (sin datos sensibles)
  private toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  async getAllUsers(query: PaginationQuery & UserFilters): Promise<{
    users: UserResponseDto[];
    meta: PaginationMeta;
  }> {
    try {
      const { page = 1, limit = 10 } = query;
      const cacheKey = `users:list:${JSON.stringify(query)}`;

      // Intentar obtener del cache
      const cached = await this.cache.get<{ users: UserResponseDto[]; meta: PaginationMeta }>(
        cacheKey,
      );
      if (cached) {
        logger.debug({ cacheKey }, 'Users fetched from cache');
        return cached;
      }

      // Obtener de la base de datos
      const [users, total] = await Promise.all([
        this.userRepository.findAll(query),
        this.userRepository.count(query),
      ]);

      const result = {
        users: users.map((user) => this.toResponseDto(user)),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

      // Guardar en cache por 5 minutos
      await this.cache.set(cacheKey, result, 300);

      return result;
    } catch (error) {
      logger.error({ err: error }, 'Error in UserService.getAllUsers');
      throw error;
    }
  }

  async getUserById(id: string): Promise<UserResponseDto> {
    try {
      const cacheKey = `user:${id}`;

      // Intentar obtener del cache
      const cached = await this.cache.get<UserResponseDto>(cacheKey);
      if (cached) {
        logger.debug({ id, cacheKey }, 'User fetched from cache');
        return cached;
      }

      // Obtener de la base de datos
      const user = await this.userRepository.findById(id);

      if (!user) {
        throw new NotFoundError('User');
      }

      const responseDto = this.toResponseDto(user);

      // Guardar en cache por 10 minutos
      await this.cache.set(cacheKey, responseDto, 600);

      return responseDto;
    } catch (error) {
      logger.error({ err: error, id }, 'Error in UserService.getUserById');
      throw error;
    }
  }

  async createUser(data: CreateUserDto): Promise<UserResponseDto> {
    try {
      // Validar que el email no exista
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Aquí deberías hashear el password
      // const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await this.userRepository.create(data);

      // Invalidar cache de lista de usuarios
      await this.cache.delPattern('users:list:*');

      logger.info({ userId: user.id, email: user.email }, 'User created');

      return this.toResponseDto(user);
    } catch (error) {
      logger.error({ err: error, data }, 'Error in UserService.createUser');
      throw error;
    }
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<UserResponseDto> {
    try {
      // Verificar que el usuario existe
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        throw new NotFoundError('User');
      }

      // Si se está actualizando el email, verificar que no exista
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await this.userRepository.findByEmail(data.email);
        if (emailExists) {
          throw new ConflictError('Email already in use');
        }
      }

      // Validar que haya al menos un campo para actualizar
      if (Object.keys(data).length === 0) {
        throw new BadRequestError('No fields to update');
      }

      const updatedUser = await this.userRepository.update(id, data);

      // Invalidar caches
      await Promise.all([this.cache.del(`user:${id}`), this.cache.delPattern('users:list:*')]);

      logger.info({ userId: id }, 'User updated');

      return this.toResponseDto(updatedUser);
    } catch (error) {
      logger.error({ err: error, id, data }, 'Error in UserService.updateUser');
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      // Verificar que el usuario existe
      const exists = await this.userRepository.exists(id);
      if (!exists) {
        throw new NotFoundError('User');
      }

      await this.userRepository.delete(id);

      // Invalidar caches
      await Promise.all([this.cache.del(`user:${id}`), this.cache.delPattern('users:list:*')]);

      logger.info({ userId: id }, 'User deleted');
    } catch (error) {
      logger.error({ err: error, id }, 'Error in UserService.deleteUser');
      throw error;
    }
  }
}

// Singleton instance
export const userService = new UserService(new UserRepository());
