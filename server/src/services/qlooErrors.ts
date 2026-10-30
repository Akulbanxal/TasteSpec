export type QlooErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_INPUT'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'SERVER_ERROR'
  | 'MALFORMED_JSON'
  | 'SCHEMA_MISMATCH'
  | 'EMPTY_RESULTS';

export class QlooClientError extends Error {
  public readonly code: QlooErrorCode;
  public readonly statusCode?: number;
  public readonly endpoint?: string;
  public readonly safeDetails?: string;

  constructor(code: QlooErrorCode, message: string, options?: { statusCode?: number; endpoint?: string; safeDetails?: string }) {
    super(message);
    this.name = 'QlooClientError';
    this.code = code;
    this.statusCode = options?.statusCode;
    this.endpoint = options?.endpoint;
    this.safeDetails = options?.safeDetails;

    // Sanitize any accidental credentials in error stack
    if (this.stack) {
      this.stack = this.stack.replace(/key=[^&\s]+/gi, 'key=[REDACTED]');
    }
  }
}
