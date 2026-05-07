import { db } from "@/server/db";
import { users, userPreferences } from "@/server/db/schema";
import { eq } from "drizzle-orm";

// ======================================================
//                        Types
// ======================================================

export type ProfileUpdate = {
  fullName: string;
  currency: string;
};

export type AvatarUpdate = {
  avatarUrl: string;
};

export type PreferencesUpdate = {
  theme: string;
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  lowBalanceThreshold: string;
};

// ======================================================
//                        Mutations
// ======================================================

export async function updateUserProfile(userId: string, data: ProfileUpdate) {
  const [updated] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, userId))
    .returning();
  return updated ?? null;
}

export async function updateUserAvatar(userId: string, data: AvatarUpdate) {
  const [updated] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, userId))
    .returning();
  return updated ?? null;
}

export async function updateUserPreferences(
  userId: string,
  data: PreferencesUpdate,
) {
  const [updated] = await db
    .update(userPreferences)
    .set(data)
    .where(eq(userPreferences.userId, userId))
    .returning();
  return updated ?? null;
}
