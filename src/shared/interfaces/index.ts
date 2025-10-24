// Response genérico para APIs
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: PaginationMeta;
}

// Metadata de paginación
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Query params de paginación
export interface PaginationQuery {
  page: number;
  limit: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

// Base Repository Interface
export interface IRepository<T> {
  findAll(query?: PaginationQuery): Promise<T[]>;
  findById(id: number | string): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: number | string, data: Partial<T>): Promise<T>;
  delete(id: number | string): Promise<void>;
}

// Cache Interface
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  delPattern(pattern: string): Promise<number>;
}

// Auth payload
export interface AuthPayload {
  id: number | string;
  email: string;
  roles?: string[];
}

// Token response
export interface TokenResponse {
  token: string;
  refreshToken?: string;
  expiresIn: string;
}
