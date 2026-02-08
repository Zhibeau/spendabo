import { auth } from '../firebase/config';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Standard API response format from backend
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    pagination?: {
      cursor?: string;
      hasMore: boolean;
      total?: number;
    };
  };
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get the current user's auth token
 */
async function getAuthToken(): Promise<string> {
  const user = auth?.currentUser;
  if (!user) {
    throw new ApiError('UNAUTHORIZED', 'Not authenticated', 401);
  }
  return user.getIdToken();
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getAuthToken();

  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!data.success && data.error) {
    throw new ApiError(
      data.error.code,
      data.error.message,
      response.status,
      data.error.details
    );
  }

  return data;
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};

/**
 * SWR fetcher that uses the API client
 */
export async function swrFetcher<T>(endpoint: string): Promise<T> {
  const response = await api.get<T>(endpoint);
  if (!response.data) {
    throw new Error('No data returned');
  }
  return response.data;
}
