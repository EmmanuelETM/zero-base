import { z } from "zod";

export const createTransferSchema = z
  .object({
    fromAccountId: z.uuid("Selecciona una cuenta de origen"),
    toAccountId: z.uuid("Selecciona una cuenta de destino"),
    amount: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Monto inválido")
      .refine((val) => Number(val) > 0, "El monto debe ser mayor a 0"),
    applyCommission: z.boolean(),
    commissionAmount: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Monto inválido")
      .optional(),
    description: z.string().min(1, "La descripción es obligatoria"),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "La cuenta de origen y destino no pueden ser la misma",
    path: ["toAccountId"],
  });

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
