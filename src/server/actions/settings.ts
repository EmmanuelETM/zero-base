"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/server/supabase/server";
import { db } from "@/server/db";
import { users, userPreferences } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  UpdateProfileSchema,
  UpdatePreferencesSchema,
} from "@/lib/validations/settings";

// ─── Shared state type ────────────────────────────────────────────────────────

export type SettingsState = {
  error?: string;
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
};

// ─── Helper: get authenticated user id ───────────────────────────────────────

async function getAuthUserId(): Promise<string | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ─── Update Profile ───────────────────────────────────────────────────────────

export async function updateProfileAction(
  _state: SettingsState | undefined,
  formData: FormData,
): Promise<SettingsState> {
  const raw = {
    fullName: formData.get("fullName"),
    currency: formData.get("currency"),
  };

  const parsed = UpdateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const userId = await getAuthUserId();
  if (!userId) return { error: "No autenticado." };

  await db
    .update(users)
    .set({
      fullName: parsed.data.fullName,
      currency: parsed.data.currency,
    })
    .where(eq(users.id, userId));

  revalidatePath("/settings/profile");
  return { message: "Perfil actualizado correctamente." };
}

// ─── Upload Avatar ─────────────────────────────────────────────────────────────

/**
 * Uploads the avatar to Supabase Storage (bucket: "avatars") and updates the
 * `avatar_url` column in the `users` table.
 *
 * The bucket must be public (or you can use signed URLs). Configure it in
 * Supabase Dashboard → Storage → avatars → Make Public.
 */
export async function uploadAvatarAction(
  _state: SettingsState | undefined,
  formData: FormData,
): Promise<SettingsState> {
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona una imagen válida." };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "La imagen no puede superar 5 MB." };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Formato no soportado. Usa JPG, PNG, WebP o GIF." };
  }

  const userId = await getAuthUserId();
  if (!userId) return { error: "No autenticado." };

  const supabase = await createServerClient();

  // Use a deterministic path so each upload overwrites the previous avatar
  // instead of creating orphan files.
  const ext = file.type.split("/")[1];
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    console.error("[uploadAvatar]", uploadError);
    return { error: "Error al subir la imagen. Intenta de nuevo." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  // Append a cache-busting query param so the browser re-fetches the image.
  const avatarUrl = `${publicUrl}?t=${Date.now()}`;

  await db.update(users).set({ avatarUrl }).where(eq(users.id, userId));

  revalidatePath("/settings/profile");
  return { message: "Avatar actualizado correctamente." };
}

// ─── Update Preferences ───────────────────────────────────────────────────────

export async function updatePreferencesAction(
  _state: SettingsState | undefined,
  formData: FormData,
): Promise<SettingsState> {
  const raw = {
    theme: formData.get("theme"),
    enablePushNotifications: formData.get("enablePushNotifications") === "true",
    enableEmailNotifications:
      formData.get("enableEmailNotifications") === "true",
    lowBalanceThreshold: Number(formData.get("lowBalanceThreshold") ?? 0),
  };

  const parsed = UpdatePreferencesSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const userId = await getAuthUserId();
  if (!userId) return { error: "No autenticado." };

  await db
    .update(userPreferences)
    .set({
      theme: parsed.data.theme,
      enablePushNotifications: parsed.data.enablePushNotifications,
      enableEmailNotifications: parsed.data.enableEmailNotifications,
      lowBalanceThreshold: String(parsed.data.lowBalanceThreshold),
    })
    .where(eq(userPreferences.userId, userId));

  revalidatePath("/settings/preferences");
  return { message: "Preferencias guardadas." };
}
