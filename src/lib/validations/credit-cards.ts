import { z } from "zod";

export const createCreditCardSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(50),
  creditLimit: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Monto inválido")
    .default("0.00"),
  cutDay: z.coerce
    .number()
    .min(1, "Debe ser entre 1 y 28")
    .max(28, "Debe ser entre 1 y 28"),
  paymentDay: z.coerce
    .number()
    .min(1, "Debe ser entre 1 y 28")
    .max(28, "Debe ser entre 1 y 28"),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const updateCreditCardSchema = createCreditCardSchema.partial();

export type CreateCreditCardInput = z.infer<typeof createCreditCardSchema>;
export type UpdateCreditCardInput = z.infer<typeof updateCreditCardSchema>;
