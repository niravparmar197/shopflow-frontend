/** The gateway's error body: { code, message, details?, correlationId } */
interface ErrorBody {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  correlationId?: unknown;
}

/** Every failed call becomes an ApiError, so the UI can switch on `code`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly correlationId: string | null;
  /** From the Retry-After header (429 RATE_LIMITED / SERVER_BUSY, 503) */
  readonly retryAfterSec: number | null;

  constructor(init: {
    status: number;
    code: string;
    message: string;
    details?: unknown;
    correlationId?: string | null;
    retryAfterSec?: number | null;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
    this.correlationId = init.correlationId ?? null;
    this.retryAfterSec = init.retryAfterSec ?? null;
  }

  /** Field messages from a 400 "Validation failed" (class-validator strings). */
  get validationMessages(): string[] {
    return Array.isArray(this.details)
      ? this.details.filter((d): d is string => typeof d === 'string')
      : [];
  }

  static async fromResponse(res: Response, fallbackCorrelationId: string): Promise<ApiError> {
    let body: ErrorBody = {};
    try {
      body = (await res.json()) as ErrorBody;
    } catch {
      // not JSON (e.g. a proxy error page)
    }
    const retryAfter = Number(res.headers.get('Retry-After'));
    return new ApiError({
      status: res.status,
      code: typeof body.code === 'string' ? body.code : `HTTP_${res.status}`,
      message: typeof body.message === 'string' ? body.message : res.statusText || 'Request failed',
      details: body.details,
      correlationId:
        typeof body.correlationId === 'string'
          ? body.correlationId
          : (res.headers.get('x-correlation-id') ?? fallbackCorrelationId),
      retryAfterSec: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    });
  }

  static network(err: unknown, correlationId: string): ApiError {
    return new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: err instanceof Error ? err.message : 'Network error',
      correlationId,
    });
  }
}

export const isApiError = (err: unknown): err is ApiError => err instanceof ApiError;
