"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowsLeftRightIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  SignOutIcon,
  SlidersIcon,
  ListIcon,
  PiggyBankIcon,
  BankIcon,
  WalletIcon,
} from "@phosphor-icons/react";
import { useState, useTransition } from "react";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/server/actions/auth";

// ─── Nav items ────────────────────────────────────────────────────────────────

const navItems = [
  { label: "Analíticas", href: "/analytics", icon: ChartBarIcon },
  { label: "Cuentas", href: "/accounts", icon: BankIcon },
  { label: "Tarjetas", href: "/cards", icon: WalletIcon },
  { label: "Transacciones", href: "/transactions", icon: ArrowsLeftRightIcon },
  { label: "Presupuestos", href: "/budget", icon: PiggyBankIcon },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface GlobalHeaderProps {
  user: {
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GlobalHeader({ user }: GlobalHeaderProps) {
  const pathname = usePathname();
  const { toggleCommandMenu } = useUIStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      {/* ── Floating Header ───────────────────────────────────────────────── */}
      <header
        className={cn(
          // Layout
          "sticky top-0 z-40 w-full",
          // Glassmorphism
          "border-border/40 border-b",
          "bg-background/80 backdrop-blur-md",
          "supports-backdrop-filter:bg-background/60",
        )}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-6">
          {/* ── Logo ─────────────────────────────────────────────────────── */}
          <Link
            href="/accounts"
            id="header-logo"
            className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"
          >
            <div className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg text-xs font-bold">
              Z
            </div>
            <span className="hidden sm:inline sm:text-xl">ZeroBase</span>
          </Link>

          {/* ── Desktop Nav (centered) ────────────────────────────────────── */}
          <nav
            aria-label="Navegación principal"
            className="hidden flex-1 items-center justify-center gap-1 md:flex"
          >
            {navItems.map(({ label, href, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  id={`nav-${label.toLowerCase()}`}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Icon
                    weight={isActive ? "fill" : "regular"}
                    className="size-4"
                  />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* ── Right actions ─────────────────────────────────────────────── */}
          <div className="ml-auto flex items-center gap-2">
            {/* ⌘K trigger button */}
            <button
              id="command-menu-trigger"
              type="button"
              onClick={toggleCommandMenu}
              aria-label="Abrir menú de comandos (⌘K)"
              className={cn(
                "hidden items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors md:flex",
                "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <MagnifyingGlassIcon className="size-3.5" />
              <span className="hidden text-xs lg:inline">Buscar...</span>
              <kbd className="bg-background/80 ml-1 hidden rounded border px-1.5 py-0.5 font-mono text-[10px] lg:inline">
                ⌘K
              </kbd>
            </button>

            {/* User avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                id="user-menu-trigger"
                aria-label="Menú de usuario"
                className="focus-visible:ring-ring rounded-full ring-offset-2 outline-none focus-visible:ring-2"
              >
                <Avatar size="default">
                  <AvatarImage
                    src={user.avatarUrl ?? undefined}
                    alt={user.fullName}
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" sideOffset={8}>
                {/* User info */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-foreground text-sm leading-none font-medium">
                        {user.fullName}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <Link href={"/settings/profile"}>
                  <DropdownMenuItem id="menu-profile">
                    <UserCircleIcon weight="duotone" className="size-4" />
                    Mi Perfil
                  </DropdownMenuItem>
                </Link>

                <Link href={"/settings/preferences"}>
                  <DropdownMenuItem id="menu-preferences">
                    <SlidersIcon weight="duotone" className="size-4" />
                    Preferencias
                  </DropdownMenuItem>
                </Link>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  id="menu-logout"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      await logoutAction();
                    });
                  }}
                >
                  <SignOutIcon weight="duotone" className="size-4" />
                  {isPending ? "Cerrando..." : "Cerrar sesión"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile: hamburger / ⌘K FAB area */}
            <button
              id="mobile-menu-trigger"
              type="button"
              aria-label="Abrir menú móvil"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="text-muted-foreground hover:text-foreground flex size-9 items-center justify-center rounded-lg transition-colors md:hidden"
            >
              <ListIcon className="size-5" />
            </button>
          </div>
        </div>

        {/* ── Mobile Nav Drawer ─────────────────────────────────────────────── */}
        {mobileMenuOpen && (
          <div className="border-border/40 bg-background/95 border-t px-4 pb-4 backdrop-blur-md md:hidden">
            <nav aria-label="Navegación móvil" className="mt-3 space-y-1">
              {navItems.map(({ label, href, icon: Icon }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <Icon
                      weight={isActive ? "fill" : "regular"}
                      className="size-4"
                    />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile ⌘K button */}
            <button
              id="mobile-command-trigger"
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                toggleCommandMenu();
              }}
              className="border-border/60 bg-muted/40 text-muted-foreground mt-3 flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm"
            >
              <MagnifyingGlassIcon className="size-4" />
              Buscar acciones…
            </button>
          </div>
        )}
      </header>
    </>
  );
}
