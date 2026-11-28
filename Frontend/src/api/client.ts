import { ApiResponse, ApiErrorResponse, AppApiError } from './types';

/**
 * Resolves API Base URL dynamically:
 * - Server runtime: uses internal bound service URL process.env.BACKEND_URL if available
 * - Client runtime: uses process.env.NEXT_PUBLIC_API_URL or relative public path '/api/v1'
 * - Local development fallback: 'http://localhost:5000/api/v1'
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    if (process.env.BACKEND_URL) {
      const base = process.env.BACKEND_URL.endsWith('/')
        ? process.env.BACKEND_URL
        : `${process.env.BACKEND_URL}/`;
      return new URL('api/v1', base).toString().replace(/\/$/, '');
    }
    if (process.env.NEXT_PUBLIC_API_URL?.trim()) {
      return process.env.NEXT_PUBLIC_API_URL.trim();
    }
    return process.env.NODE_ENV === 'production' ? '/api/v1' : 'http://localhost:5000/api/v1';
  }

  if (process.env.NEXT_PUBLIC_API_URL?.trim()) {
    return process.env.NEXT_PUBLIC_API_URL.trim();
  }
  return '/api/v1';
}

let inMemoryAccessToken: string | null = null;

export const setAuthToken = (token: string | null): void => {
  inMemoryAccessToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        sessionStorage.setItem('crm_session_token', token);
      } else {
        sessionStorage.removeItem('crm_session_token');
      }
    } catch {
      // In-memory fallback
    }
  }
};

export const getAuthToken = (): string | null => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('crm_session_token');
      if (stored) {
        inMemoryAccessToken = stored;
        return stored;
      }
    } catch {
      return null;
    }
  }
  return null;
};

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Centralized typed API client
 * Enforces:
 * - Base URL from NEXT_PUBLIC_API_URL
 * - credentials: 'include' for HttpOnly cookie authentication
 * - Authorization: Bearer fallback for cross-origin or cookie-restricted environments
 * - Standardized error parsing
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, body, headers, ...customConfig } = options;

  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${cleanEndpoint}`;

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

  const token = getAuthToken();
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const config: RequestInit = {
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...(headers as Record<string, string>),
    },
    credentials: 'include', // Essential for HttpOnly cookies (access & refresh tokens)
  };

  if (body !== undefined) {
    config.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, config);

    // If 401 Unauthorized, transparently attempt a refresh and replay once
    if (response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
      try {
        const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newAccessToken = refreshData?.data?.accessToken || refreshData?.accessToken;
          if (newAccessToken) {
            setAuthToken(newAccessToken);
            const retryHeaders = {
              ...defaultHeaders,
              ...(headers as Record<string, string>),
              Authorization: `Bearer ${newAccessToken}`,
            };
            response = await fetch(url, { ...config, headers: retryHeaders });
          }
        }
      } catch {
        // Continue to regular error handling
      }
    }
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
    let errorMessage = errorBody?.error?.message;
    if (errorBody?.error?.details && Array.isArray(errorBody.error.details)) {
      const detailMessages = (errorBody.error.details as Array<{ message?: string; error?: string }>)
        .map((d) => d.message || d.error)
        .filter(Boolean);
      if (detailMessages.length > 0) {
        errorMessage = detailMessages.join('. ');
      }
    }
    if (!errorMessage) {
      errorMessage =
        (typeof responseData === 'string' && responseData.length > 0 ? responseData : undefined) ||
        `HTTP Error ${response.status}: ${response.statusText}`;
    }
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
