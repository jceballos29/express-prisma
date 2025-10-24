import { prisma } from '../../config/database';
import type { PrismaClient } from '../../generated/prisma/client';
import type { TransactionClient } from '../../generated/prisma/internal/prismaNamespace';
import { logger } from '../../shared/utils';

/**
 * Servicio para operaciones de base de datos transaccionales y avanzadas
 */
export class DatabaseService {
  private client: PrismaClient;

  constructor() {
    this.client = prisma;
  }

  /**
   * Ejecutar operaciones en una transacción
   */
  async transaction<T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T> {
    try {
      return await this.client.$transaction(callback);
    } catch (error) {
      logger.error({ err: error }, 'Transaction failed');
      throw error;
    }
  }

  /**
   * Ejecutar query raw con parámetros seguros
   */
  async queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T> {
    try {
      return (await this.client.$queryRaw(query, ...values)) as T;
    } catch (error) {
      logger.error({ err: error, query }, 'Raw query failed');
      throw error;
    }
  }

  /**
   * Ejecutar comando raw (INSERT, UPDATE, DELETE)
   */
  async executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number> {
    try {
      return await this.client.$executeRaw(query, ...values);
    } catch (error) {
      logger.error({ err: error, query }, 'Raw execution failed');
      throw error;
    }
  }

  /**
   * Health check de la base de datos
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error({ err: error }, 'Database health check failed');
      return false;
    }
  }

  /**
   * Obtener estadísticas de la base de datos
   */
  async getStats(): Promise<{
    connected: boolean;
    poolSize?: number;
    activeConnections?: number;
  }> {
    try {
      const connected = await this.healthCheck();

      // Prisma no expone pool stats directamente, pero podemos agregarlo si usamos un pool custom
      return {
        connected,
      };
    } catch (error) {
      logger.error({ err: error }, 'Failed to get database stats');
      return { connected: false };
    }
  }

  /**
   * Ejecutar operaciones en batch
   */
  async batchOperations<T>(operations: Array<Promise<T>>): Promise<T[]> {
    try {
      return await Promise.all(operations);
    } catch (error) {
      logger.error({ err: error }, 'Batch operations failed');
      throw error;
    }
  }

  /**
   * Soft delete - agregar campo deletedAt en lugar de eliminar
   */
  // async softDelete<T extends { id: number | string }>(model: string, id: T['id']): Promise<T> {
  //   try {
  //     const modelName = model.charAt(0).toLowerCase() + model.slice(1);
  //     // Prisma Client usa índices dinámicos, por eso necesitamos forzar el tipo aquí
  //     return (await (this.client as PrismaClient & Record<string, any>)[modelName].update({
  //       where: { id },
  //       data: { deletedAt: new Date() },
  //     })) as T;
  //   } catch (error) {
  //     logger.error({ err: error, model, id }, 'Soft delete failed');
  //     throw error;
  //   }
  // }

  /**
   * Obtener cliente Prisma directo (usar con precaución)
   */
  getClient(): PrismaClient {
    return this.client;
  }
}

// Singleton instance
export const databaseService = new DatabaseService();
