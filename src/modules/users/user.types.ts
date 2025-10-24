import type { Role } from '@/generated/prisma/enums';

// Domain entity
export interface User {
  id: string;
  email: string;
  name: string | null;
  password: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs (Data Transfer Objects)
export interface CreateUserDto {
  email: string;
  name?: string;
  password: string;
  role?: Role;
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
}

export interface UserResponseDto {
  id: string;
  email: string;
  name: string | null;
  role?: Role;
  createdAt: Date;
}

// Filters para queries
export interface UserFilters {
  email?: string;
  name?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}
