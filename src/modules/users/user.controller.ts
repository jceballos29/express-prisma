import type { NextFunction, Request, Response } from 'express';

import type { TypedRequest } from '@/shared/types/request';

import { UserRepository } from './user.repository';
import type {
  CreateUserInput,
  PaginationQuery,
  UpdateUserInput,
  UserIdParams,
} from './user.schemas';
import { UserService } from './user.service';
import type { UserResponseDto } from './user.types';
import type { ApiResponse } from '../../shared/interfaces';

export class UserController {
  constructor(private userService: UserService) {}

  // GET /users
  getAllUsers = async (
    req: TypedRequest<PaginationQuery>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = req.query;
      const result = await this.userService.getAllUsers(query);

      const response: ApiResponse<UserResponseDto[]> = {
        success: true,
        data: result.users,
        meta: result.meta,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // GET /users/:id
  getUserById = async (
    req: TypedRequest<undefined, undefined, UserIdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);

      const response: ApiResponse<UserResponseDto> = {
        success: true,
        data: user,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // POST /users
  createUser = async (
    req: TypedRequest<undefined, CreateUserInput>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userData = req.body;
      const user = await this.userService.createUser(userData);

      const response: ApiResponse<UserResponseDto> = {
        success: true,
        data: user,
        message: 'User created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  // PUT /users/:id
  updateUser = async (
    req: TypedRequest<undefined, UpdateUserInput, UserIdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.params;
      const userData = req.body;
      const user = await this.userService.updateUser(id, userData);

      const response: ApiResponse<UserResponseDto> = {
        success: true,
        data: user,
        message: 'User updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // DELETE /users/:id
  deleteUser = async (
    req: TypedRequest<undefined, undefined, UserIdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.params;
      await this.userService.deleteUser(id);

      const response: ApiResponse<null> = {
        success: true,
        message: 'User deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // GET /users/me (perfil del usuario autenticado)
  getProfile = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = res.locals.user.id;
      const user = await this.userService.getUserById(userId);

      const response: ApiResponse<UserResponseDto> = {
        success: true,
        data: user,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}

// Singleton instance
export const userController = new UserController(new UserService(new UserRepository()));
