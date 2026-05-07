import { ZodError } from "zod";

export type AppError =
  // Auth
  | { code: "UNAUTHORIZED" }
  | { code: "FORBIDDEN"; reason?: string }

  // Validación
  | { code: "VALIDATION"; details: ZodError }

  // Recursos
  | { code: "NOT_FOUND"; resource: string }
  | { code: "CONFLICT"; resource: string; reason?: string }

  // Base de datos
  | { code: "DB_ERROR"; cause?: unknown }

  // Negocio / dominio
  | { code: "INSUFFICIENT_FUNDS"; available: number; required: number }
  | { code: "LIMIT_EXCEEDED"; resource: string; limit: number }

  // Externos
  | { code: "EXTERNAL_SERVICE_ERROR"; service: string; cause?: unknown }

  // Fallback
  | { code: "UNKNOWN"; cause?: unknown };

// Convierte errores de AppError a mensajes legibles para el usuario
export const toUserMessage = (error: AppError): string => {
  switch (error.code) {
    case "UNAUTHORIZED":
      return "Debes iniciar sesión para continuar.";
    case "FORBIDDEN":
      return error.reason ?? "No tienes permiso para realizar esta acción.";
    case "VALIDATION":
      return "Los datos enviados no son válidos.";
    case "NOT_FOUND":
      return `${error.resource} no encontrado.`;
    case "CONFLICT":
      return error.reason ?? `${error.resource} ya existe.`;
    case "DB_ERROR":
      return "Error al acceder a la base de datos.";
    case "INSUFFICIENT_FUNDS":
      return `Fondos insuficientes. Disponible: ${error.available}, requerido: ${error.required}.`;
    case "LIMIT_EXCEEDED":
      return `Has alcanzado el límite de ${error.resource} (${error.limit}).`;
    case "EXTERNAL_SERVICE_ERROR":
      return `Error al conectar con ${error.service}. Intenta más tarde.`;
    case "UNKNOWN":
      return "Ocurrió un error inesperado.";
  }
};

// Los mensajes de Supabase vienen en inglés y son técnicos
const SUPABASE_AUTH_ERRORS: Record<string, string> = {
  "Invalid login credentials":
    "Credenciales incorrectas. Verifica tu correo y contraseña.",
  "Email not confirmed": "Confirma tu correo antes de iniciar sesión.",
  "User already registered": "Ya existe una cuenta con este correo.",
  "Password should be at least 6 characters":
    "La contraseña debe tener al menos 6 caracteres.",
  "Token has expired or is invalid":
    "El enlace ha expirado. Solicita uno nuevo.",
} as const;

export function toAuthErrorMessage(message: string): string {
  return SUPABASE_AUTH_ERRORS[message] ?? "Ocurrió un error inesperado.";
}
