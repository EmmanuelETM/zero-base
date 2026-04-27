import { z } from "zod";
import { ACCOUNT_TYPES } from "../constants";

export const createAccountSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(50),
  type: z.enum(ACCOUNT_TYPES),
  balance: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Monto inválido")
    .default("0.00"),
  isOperational: z.boolean().default(false),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const updateAccountSchema = createAccountSchema.partial();

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
