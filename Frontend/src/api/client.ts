import { ApiResponse, ApiErrorResponse, AppApiError } from './types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:5000/api/v1';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Centralized typed API client
 * Enforces:
 * - Base URL from NEXT_PUBLIC_API_URL
 * - credentials: 'include' for HttpOnly cookie authentication
 * - Standardized error parsing
 * - Zero tokens stored in localStorage
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, body, headers, ...customConfig } = options;

  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const config: RequestInit = {
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    credentials: 'include', // Essential for HttpOnly cookies (access & refresh tokens)
  };

  if (body !== undefined) {
    config.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (networkError: unknown) {
    const message = networkError instanceof Error ? networkError.message : 'Network request failed';
    throw new AppApiError(`Connection error: ${message}. Is the backend running?`, 0, 'NETWORK_ERROR');
  }

  let responseData: unknown = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    try {
      responseData = await response.text();
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    const errorBody = responseData as ApiErrorResponse | null;
    const errorMessage =
      errorBody?.error?.message ||
      (typeof responseData === 'string' && responseData.length > 0 ? responseData : undefined) ||
      `HTTP Error ${response.status}: ${response.statusText}`;
    const errorCode = errorBody?.error?.code || `HTTP_${response.status}`;
    const errorDetails = errorBody?.error?.details;

    throw new AppApiError(errorMessage, response.status, errorCode, errorDetails);
  }

  // If response is formatted as { success: true, data: T }
  const parsed = responseData as ApiResponse<T>;
  if (parsed && typeof parsed === 'object' && 'success' in parsed) {
    return parsed.data as T;
  }

  return responseData as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
