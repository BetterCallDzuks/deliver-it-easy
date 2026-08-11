/**
 * Thin HTTP helper shared by the Google-backed services.
 *
 * Centralises timeout handling and error normalisation so locationService and
 * routingService don't each reimplement fetch plumbing. It knows nothing about
 * Places or Directions specifically — the services own their endpoints/shapes.
 */

/** Raised for any failed Google API interaction, with a driver-friendly message. */
export class GoogleApiError extends Error {
  constructor(
    message: string,
    /** Provider status string (e.g. "REQUEST_DENIED") when available. */
    readonly status?: string,
  ) {
    super(message);
    this.name = 'GoogleApiError';
  }
}

const DEFAULT_TIMEOUT_MS = 12_000;

interface FetchJsonOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

/**
 * fetch + JSON parse with a hard timeout. Network/timeout failures are turned
 * into a GoogleApiError so callers can show one consistent message.
 */
export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: options.headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      // Try to surface the provider's error message if there is a JSON body.
      let detail = `HTTP ${response.status}`;
      try {
        const errBody = (await response.json()) as {
          error?: { message?: string; status?: string };
          error_message?: string;
        };
        detail = errBody.error?.message ?? errBody.error_message ?? detail;
        throw new GoogleApiError(detail, errBody.error?.status);
      } catch (parseError) {
        if (parseError instanceof GoogleApiError) throw parseError;
        throw new GoogleApiError(detail);
      }
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof GoogleApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GoogleApiError('The request timed out. Check your connection.');
    }
    throw new GoogleApiError('Network error. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
}

/** Build a `?a=b&c=d` query string, skipping null/undefined values. */
export function toQuery(params: Record<string, string | number | undefined | null>): string {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}
