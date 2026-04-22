import { redirect } from "next/navigation";
import { createServerClient } from "@/server/supabase/server";
import { ResetPasswordForm } from "@/components/features/auth/reset-password-form";

/**
 * This page is only reachable after the user has:
 *   1. Clicked the password-reset link in their email.
 *   2. Been redirected to /api/auth/callback?next=/reset-password which
 *      exchanged the PKCE code for a real Supabase session.
 *
 * If there is no active session (e.g. the user navigated here directly or the
 * link expired), we redirect them back to /forgot-password.
 */
export default async function ResetPasswordPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password?error=expired");
  }

  return <ResetPasswordForm />;
}
