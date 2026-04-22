import { z } from "zod";

// ─── Profile ──────────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre no puede exceder 80 caracteres")
    .trim(),
  currency: z.enum(["DOP", "USD", "EUR"], {
    message: "Selecciona una moneda válida",
  }),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// ─── Preferences ──────────────────────────────────────────────────────────────

export const UpdatePreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"], {
    message: "Selecciona un tema válido",
  }),
  enablePushNotifications: z.boolean(),
  enableEmailNotifications: z.boolean(),
  lowBalanceThreshold: z
    .number({ error: "Debe ser un número" })
    .min(0, "El umbral no puede ser negativo")
    .max(10_000_000, "Valor demasiado alto"),
});

export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;
