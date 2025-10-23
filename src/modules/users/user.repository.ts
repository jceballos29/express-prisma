import { prisma } from '../../config/database';
import { IRepository, PaginationQuery } from '../../shared/interfaces';
import { User, CreateUserDto, UpdateUserDto, UserFilters } from './user.types';
import { logger } from '../../shared/utils';
import { UserWhereInput } from '../../generated/prisma/models';

export class UserRepository implements IRepository<User> {
  async findAll(query?: PaginationQuery & UserFilters): Promise<User[]> {
    try {
      const { 
        page = 1, 
        limit = 10, 
        sortBy = 'createdAt', 
        order = 'desc', 
        email, // <- Directamente aquí
        name,  // <- Directamente aquí
        createdAfter, // <- Directamente aquí
        createdBefore // <- Directamente aquí
      } = query || {};
      
      const skip = (page - 1) * limit;
      
      // Construir where clause
      const where: UserWhereInput = {};
      if (email) where.email = { contains: email };
      if (name) where.name = { contains: name };
      if (createdAfter || createdBefore) {
        where.createdAt = {};
        if (createdAfter) where.createdAt.gte = createdAfter;
        if (createdBefore) where.createdAt.lte = createdBefore;
      }

      return await prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
      });
    } catch (error) {
      logger.error({ err: error }, 'Error in UserRepository.findAll');
      throw error;
    }
  }

  async count(filters?: UserFilters): Promise<number> {
    try {
      const where: any = {};
      if (filters?.email) where.email = { contains: filters.email };
      if (filters?.name) where.name = { contains: filters.name };
      
      return await prisma.user.count({ where });
    } catch (error) {
      logger.error({ err: error }, 'Error in UserRepository.count');
      throw error;
    }
  }

  async findById(id: number | string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id: typeof id === 'string' ? parseInt(id) : id },
      });
    } catch (error) {
      logger.error({ err: error, id }, 'Error in UserRepository.findById');
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { email },
      });
    } catch (error) {
      logger.error({ err: error, email }, 'Error in UserRepository.findByEmail');
      throw error;
    }
  }

  async create(data: CreateUserDto): Promise<User> {
    try {
      return await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          // password: data.password, // Agregar cuando tengas el campo en Prisma
        },
      });
    } catch (error) {
      logger.error({ err: error, data }, 'Error in UserRepository.create');
      throw error;
    }
  }

  async update(id: number | string, data: UpdateUserDto): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id: typeof id === 'string' ? parseInt(id) : id },
        data,
      });
    } catch (error) {
      logger.error({ err: error, id, data }, 'Error in UserRepository.update');
      throw error;
    }
  }

  async delete(id: number | string): Promise<void> {
    try {
      await prisma.user.delete({
        where: { id: typeof id === 'string' ? parseInt(id) : id },
      });
    } catch (error) {
      logger.error({ err: error, id }, 'Error in UserRepository.delete');
      throw error;
    }
  }

  async exists(id: number | string): Promise<boolean> {
    try {
      const count = await prisma.user.count({
        where: { id: typeof id === 'string' ? parseInt(id) : id },
      });
      return count > 0;
    } catch (error) {
      logger.error({ err: error, id }, 'Error in UserRepository.exists');
      throw error;
    }
  }
}

// Singleton instance
export const userRepository = new UserRepository();