export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
  timestamp?: string;
}

export interface ApiErrorDetail {
  code?: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AppApiError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: unknown;

  constructor(message: string, statusCode = 500, code?: string, details?: unknown) {
    super(message);
    this.name = 'AppApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
