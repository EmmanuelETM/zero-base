import "server-only";

import { cache } from "react";
import { createServerClient } from "@/server/supabase/server";
import { db } from "@/server/db";
import { users, userPreferences } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Returns the current authenticated user's profile row from the `users` table.
 * Deduplicates calls within the same request via React.cache().
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  return user ?? null;
});

/**
 * Returns the user_preferences row for the current user.
 * Deduplicates calls within the same request via React.cache().
 */
export const getCurrentUserPreferences = cache(async () => {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, authUser.id))
    .limit(1);

  return prefs ?? null;
});
