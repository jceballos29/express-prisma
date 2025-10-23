import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../shared/interfaces';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

export class UserController {
  constructor(private userService: UserService) {}

  // GET /users
  getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as any;
      const result = await this.userService.getAllUsers(query);

      const response: ApiResponse = {
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
  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);

      const response: ApiResponse = {
        success: true,
        data: user,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // POST /users
  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userData = req.body;
      const user = await this.userService.createUser(userData);

      const response: ApiResponse = {
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
  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userData = req.body;
      const user = await this.userService.updateUser(id, userData);

      const response: ApiResponse = {
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
  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.userService.deleteUser(id);

      const response: ApiResponse = {
        success: true,
        message: 'User deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // GET /users/me (perfil del usuario autenticado)
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const user = await this.userService.getUserById(userId);

      const response: ApiResponse = {
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