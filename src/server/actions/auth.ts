"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/server/supabase/server";
import {
  LoginSchema,
  RegisterSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "@/lib/validations/auth";
import type { AuthState } from "@/types/auth";

// ===== Login =====

export async function loginAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      error: "Credenciales incorrectas. Verifica tu correo y contraseña.",
    };
  }

  redirect("/accounts");
}

// ===== Register =====

export async function registerAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    message:
      "¡Cuenta creada! Revisa tu correo para confirmar tu dirección de email.",
  };
}

// ===== Forgot Password =====

export async function forgotPasswordAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = { email: formData.get("email") };

  const parsed = ForgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password`,
    },
  );

  if (error) {
    return { error: error.message };
  }

  return {
    message:
      "Si el correo existe, recibirás un enlace para restablecer tu contraseña.",
  };
}

// ===== Reset Password =====

export async function resetPasswordAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = {
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = ResetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/login?reset=success");
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
