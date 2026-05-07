import type { AppError } from "@/lib/errors";
import type { ZodError } from "zod";

export type Ok<T> = { ok: true; data: T };
export type Err = { ok: false; error: AppError };
export type Result<T> = Ok<T> | Err;

// ─── Constructores ────────────────────────────────────────────────────────────

export const ok = <T>(data: T): Ok<T> => ({ ok: true, data });

export const err = (error: AppError): Err => ({ ok: false, error });

// Shortcuts para no escribir objetos en cada action
export const Errors = {
  unauthorized: (): Err => err({ code: "UNAUTHORIZED" }),

  forbidden: (reason?: string): Err => err({ code: "FORBIDDEN", reason }),

  validation: (details: ZodError): Err => err({ code: "VALIDATION", details }),

  notFound: (resource: string): Err => err({ code: "NOT_FOUND", resource }),

  conflict: (resource: string, reason?: string): Err =>
    err({ code: "CONFLICT", resource, reason }),

  dbError: (cause?: unknown): Err => err({ code: "DB_ERROR", cause }),

  insufficientFunds: (available: number, required: number): Err =>
    err({ code: "INSUFFICIENT_FUNDS", available, required }),

  limitExceeded: (resource: string, limit: number): Err =>
    err({ code: "LIMIT_EXCEEDED", resource, limit }),

  externalService: (service: string, cause?: unknown): Err =>
    err({ code: "EXTERNAL_SERVICE_ERROR", service, cause }),

  unknown: (cause?: unknown): Err => err({ code: "UNKNOWN", cause }),
} as const;

// ─── Type guards ───

export const isOk = <T>(result: Result<T>): result is Ok<T> => result.ok;
export const isErr = <T>(result: Result<T>): result is Err => !result.ok;

// ─── Utilidades ───

// Mapea el data si es Ok, pasa el error si es Err
export const mapResult = <T, U>(
  result: Result<T>,
  fn: (data: T) => U,
): Result<U> => {
  if (isOk(result)) return ok(fn(result.data));
  return result;
};

// Unwrap o lanzar — útil cuando estás 100% seguro del happy path
export const unwrap = <T>(result: Result<T>): T => {
  if (isOk(result)) return result.data;
  throw new Error(`Unwrap failed: ${result.error.code}`);
};
