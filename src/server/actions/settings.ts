"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/server/supabase/server";
import {
  UpdateProfileSchema,
  UpdatePreferencesSchema,
} from "@/lib/validations/settings";
import type { SettingsState } from "@/types/settings";
import { requireUser } from "@/lib/auth/requite-user";
import {
  updateUserAvatar,
  updateUserPreferences,
  updateUserProfile,
} from "../db/repositories/settings";
import { AVATAR_ALLOWED_TYPES, AVATAR_MAX_SIZE } from "@/lib/constants";
import { flattenFieldErrors } from "@/lib/validations/utils";

// ======================================================
//                        Helpers
// ======================================================
async function getAuthUserId(): Promise<string | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ======================================================
//                        Mutations
// ======================================================

export async function updateProfileAction(
  _state: SettingsState | undefined,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();

  const parsed = UpdateProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) {
    return { fieldErrors: flattenFieldErrors(parsed.error) };
  }

  const updated = await updateUserProfile(user.id, parsed.data);
  if (!updated) return { error: "No se pudo actualizar el perfil." };

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

  // Validaciones del archivo antes de tocar auth o DB
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona una imagen válida." };
  }
  if (file.size > AVATAR_MAX_SIZE) {
    return { error: "La imagen no puede superar 5 MB." };
  }
  if (!AVATAR_ALLOWED_TYPES.includes(file.type as any)) {
    return { error: "Formato no soportado. Usa JPG, PNG, WebP o GIF." };
  }

  const user = await requireUser();
  const supabase = await createServerClient();

  const ext = file.type.split("/")[1];
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    console.error("[uploadAvatar]", uploadError.message);
    return { error: "Error al subir la imagen. Intenta de nuevo." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  // Cache-busting para que el browser no sirva la imagen anterior
  const avatarUrl = `${publicUrl}?t=${Date.now()}`;

  const updated = await updateUserAvatar(user.id, { avatarUrl });
  if (!updated)
    return { error: "Imagen subida pero no se pudo guardar la URL." };

  revalidatePath("/settings/profile");
  return { message: "Avatar actualizado correctamente." };
}

// ─── Update Preferences ───────────────────────────────────────────────────────

export async function updatePreferencesAction(
  _state: SettingsState | undefined,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();

  const parsed = UpdatePreferencesSchema.safeParse({
    theme: formData.get("theme"),
    enablePushNotifications: formData.get("enablePushNotifications") === "true",
    enableEmailNotifications:
      formData.get("enableEmailNotifications") === "true",
    lowBalanceThreshold: Number(formData.get("lowBalanceThreshold") ?? 0),
  });
  if (!parsed.success) return { fieldErrors: flattenFieldErrors(parsed.error) };

  const updated = await updateUserPreferences(user.id, {
    ...parsed.data,
    lowBalanceThreshold: String(parsed.data.lowBalanceThreshold),
  });
  if (!updated) return { error: "No se pudieron guardar las preferencias." };

  revalidatePath("/settings/preferences");
  return { message: "Preferencias guardadas." };
}
