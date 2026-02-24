/**
 * Custom API errors with structured codes for client handling.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorResponse(code: string, message: string, statusCode = 400) {
  return { error: { code, message }, statusCode };
}
