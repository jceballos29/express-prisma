import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

import { logger } from '../../shared/utils';

/**
 * Cliente HTTP para llamadas a APIs externas
 */
export class HttpClient {
  private client: AxiosInstance;

  constructor(baseURL?: string, defaultHeaders?: Record<string, string>) {
    this.client = axios.create({
      baseURL,
      timeout: 30000, // 30 segundos
      headers: {
        'Content-Type': 'application/json',
        ...defaultHeaders,
      },
    });

    this.setupInterceptors();
  }

  /**
   * Configurar interceptores para logging y manejo de errores
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(
          {
            method: config.method?.toUpperCase(),
            url: config.url,
            baseURL: config.baseURL,
          },
          'HTTP Request',
        );
        return config;
      },
      (error) => {
        logger.error({ err: error }, 'HTTP Request Error');
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(
          {
            method: response.config.method?.toUpperCase(),
            url: response.config.url,
            status: response.status,
          },
          'HTTP Response',
        );
        return response;
      },
      (error: AxiosError) => {
        logger.error(
          {
            method: error.config?.method?.toUpperCase(),
            url: error.config?.url,
            status: error.response?.status,
            message: error.message,
          },
          'HTTP Response Error',
        );
        return Promise.reject(error);
      },
    );
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: T, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: T, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: T, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  /**
   * Agregar header de autorización
   */
  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Remover header de autorización
   */
  removeAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  /**
   * Obtener instancia de axios para uso avanzado
   */
  getInstance(): AxiosInstance {
    return this.client;
  }
}

// Instancia por defecto
export const httpClient = new HttpClient();

// Factory para crear clientes específicos
export function createHttpClient(baseURL: string, headers?: Record<string, string>): HttpClient {
  return new HttpClient(baseURL, headers);
}
