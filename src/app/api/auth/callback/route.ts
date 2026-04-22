import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/server/supabase/server";

/**
 * Supabase PKCE callback handler.
 *
 * Supabase appends `?code=<pkce_code>` to the `redirectTo` URL after the user
 * clicks the password-reset (or email-confirmation) link. This route exchanges
 * that one-time code for a real session and then redirects the user to the
 * appropriate destination.
 *
 * Supported `next` values (passed as a query param):
 *   - /reset-password  → after a password-recovery email
 *   - /                → default fallback
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  // `next` lets us control where to redirect after a successful exchange.
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    // No code present — redirect to login with an error hint.
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error);
    return NextResponse.redirect(`${origin}/login?error=invalid_code`);
  }

  // Redirect to the intended destination (e.g. /reset-password).
  return NextResponse.redirect(`${origin}${next}`);
}
