/**
 * API Client Base
 *
 * Cliente HTTP centralizado para todas as chamadas de API.
 * Atualmente configurado para uso local (sem backend real).
 * Quando a API estiver pronta, basta alterar o BASE_URL e
 * as implementações nos services individuais.
 */
import type { ApiError } from "@/types/api";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export class ApiClientError extends Error {
  status: number;
  code: string;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiClientError";
    this.status = error.status;
    this.code = error.code;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
      code: "UNKNOWN_ERROR",
      status: response.status,
    }));
    throw new ApiClientError(errorBody as ApiError);
  }
  return response.json();
}

export const apiClient = {
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<T>(response);
  },

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<T>(response);
  },
};
