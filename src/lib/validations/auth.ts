import { z } from "zod";

export const LoginSchema = z.object({
  email: z.email("Ingresa un correo válido.").trim(),
  password: z.string().min(1, "La contraseña es requerida."),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres.")
      .trim(),
    email: z.email("Ingresa un correo válido.").trim(),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .regex(/[a-zA-Z]/, "Debe contener al menos una letra.")
      .regex(/[0-9]/, "Debe contener al menos un número."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.email("Ingresa un correo válido.").trim(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .regex(/[a-zA-Z]/, "Debe contener al menos una letra.")
      .regex(/[0-9]/, "Debe contener al menos un número."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
