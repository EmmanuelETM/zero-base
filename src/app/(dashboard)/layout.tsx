import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createServerClient } from "@/server/supabase/server";
import { getCurrentUser } from "@/server/queries/settings";
import { GlobalHeader } from "@/components/layout/global-header";
import { CommandMenu } from "@/components/layout/command-menu";

// ─── Header skeleton ──────────────────────────────────────────────────────────

function HeaderSkeleton() {
  return (
    <div className="border-border/40 bg-background/80 sticky top-0 z-40 h-14 w-full border-b backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 md:px-6">
        <div className="bg-muted h-7 w-7 animate-pulse rounded-lg" />
        <div className="bg-muted hidden h-4 w-24 animate-pulse rounded-full md:block" />
        <div className="flex flex-1 items-center justify-center gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-muted h-7 w-24 animate-pulse rounded-lg"
            />
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="bg-muted hidden h-8 w-32 animate-pulse rounded-lg md:block" />
          <div className="bg-muted size-8 animate-pulse rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Async header (fetches user server-side) ──────────────────────────────────

async function AsyncHeader() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  // Use React.cache-backed query — deduplicates if other Server Components
  // in the same request already called getCurrentUser().
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <GlobalHeader
      user={{
        fullName: user.fullName,
        email: authUser.email ?? "",
        avatarUrl: user.avatarUrl ?? null,
      }}
    />
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Header with Suspense skeleton */}
      <Suspense fallback={<HeaderSkeleton />}>
        <AsyncHeader />
      </Suspense>

      {/* Global command menu — mounted once at layout level */}
      <CommandMenu />

      {/* Main content area */}
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8"
      >
        {children}
      </main>
    </div>
  );
}
