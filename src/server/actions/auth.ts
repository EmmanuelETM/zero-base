"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/server/supabase/server";

import {
  LoginSchema,
  RegisterSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "@/lib/validations/auth";

import { toAuthErrorMessage } from "@/lib/errors";
import { env } from "@/env";
import type { AuthState } from "@/types/auth";
import { flattenFieldErrors } from "@/lib/validations/utils";

// ======================================================
//                      Login
// ======================================================

export async function loginAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { fieldErrors: flattenFieldErrors(parsed.error) };

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: toAuthErrorMessage(error.message) };

  redirect("/analytics");
}

// ======================================================
//                      Register
// ======================================================

export async function registerAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = RegisterSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: flattenFieldErrors(parsed.error) };

  // Esta validación podría vivir en el schema con .refine(), considera moverla
  if (parsed.data.password !== parsed.data.confirmPassword) {
    return {
      fieldErrors: { confirmPassword: ["Las contraseñas no coinciden."] },
    };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });
  if (error) return { error: toAuthErrorMessage(error.message) };

  return {
    message:
      "¡Cuenta creada! Revisa tu correo para confirmar tu dirección de email.",
  };
}

// ======================================================
//                  Forgot Password
// ======================================================

export async function forgotPasswordAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = ForgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return { fieldErrors: flattenFieldErrors(parsed.error) };

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?next=/reset-password`,
    },
  );

  // Deliberadamente ambiguo — no revelamos si el correo existe o no
  if (error) console.error("[forgotPassword]", error.message);

  return {
    message:
      "Si el correo existe, recibirás un enlace para restablecer tu contraseña.",
  };
}

// ======================================================
//                    Reset Password
// ======================================================

export async function resetPasswordAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = ResetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: flattenFieldErrors(parsed.error) };

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "El enlace ha expirado o ya fue utilizado. Solicita un nuevo correo de recuperación.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: toAuthErrorMessage(error.message) };

  await supabase.auth.signOut();
  redirect("/login?reset=success");
}

// ======================================================
//                      Logout
// ======================================================

export async function logoutAction(): Promise<void> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
