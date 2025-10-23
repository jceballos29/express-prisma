// Domain entity
export interface User {
  id: number;
  email: string;
  name: string | null;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs (Data Transfer Objects)
export interface CreateUserDto {
  email: string;
  name?: string;
  password: string;
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
}

export interface UserResponseDto {
  id: number;
  email: string;
  name: string | null;
  createdAt: Date;
}

// Filters para queries
export interface UserFilters {
  email?: string;
  name?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}