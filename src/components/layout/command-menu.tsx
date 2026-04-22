"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowsLeftRightIcon,
  ChartBarIcon,
  GearIcon,
  SlidersIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  BankIcon,
  WalletIcon,
  PiggyBankIcon,
} from "@phosphor-icons/react";

import { useUIStore } from "@/stores/ui";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

// ─── Command registry ─────────────────────────────────────────────────────────

const navItems = [
  {
    label: "Analíticas",
    href: "/analytics",
    icon: ChartBarIcon,
    shortcut: "G D",
  },
  { label: "Cuentas", href: "/accounts", icon: BankIcon, shortcut: "G A" },
  { label: "Tarjetas", href: "/cards", icon: WalletIcon, shortcut: "G C" },
  {
    label: "Transacciones",
    href: "/transactions",
    icon: ArrowsLeftRightIcon,
    shortcut: "G T",
  },
  {
    label: "Presupuestos",
    href: "/budget",
    icon: PiggyBankIcon,
    shortcut: "G B",
  },
] as const;

const settingsItems = [
  { label: "Preferencias", href: "/settings/preferences", icon: SlidersIcon },
  { label: "Configuración", href: "/settings", icon: GearIcon },
] as const;

const actionItems = [
  {
    label: "Nueva Transacción",
    href: "/transactions/new",
    icon: PlusCircleIcon,
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandMenu() {
  const router = useRouter();
  const { commandMenuOpen, setCommandMenuOpen } = useUIStore();

  // ── Global keyboard shortcut ───────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandMenuOpen(!commandMenuOpen);
      }
    },
    [commandMenuOpen, setCommandMenuOpen],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Navigate and close ─────────────────────────────────────────────────────

  function runCommand(href: string) {
    setCommandMenuOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={commandMenuOpen}
      onOpenChange={setCommandMenuOpen}
      title="Menú de comandos"
      description="Navega o ejecuta acciones rápidamente"
    >
      <CommandInput placeholder="Buscar páginas o acciones…" />

      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-2">
            <MagnifyingGlassIcon
              weight="duotone"
              className="text-muted-foreground size-8"
            />
            <p className="text-muted-foreground text-sm">
              Sin resultados para tu búsqueda.
            </p>
          </div>
        </CommandEmpty>

        {/* ── Acciones rápidas ──────────────────────────────────────────── */}
        <CommandGroup heading="Acciones">
          {actionItems.map(({ label, href, icon: Icon }) => (
            <CommandItem key={href} onSelect={() => runCommand(href)}>
              <Icon weight="duotone" className="text-primary size-4" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* ── Navegación ────────────────────────────────────────────────── */}
        <CommandGroup heading="Navegar">
          {navItems.map(({ label, href, icon: Icon, shortcut }) => (
            <CommandItem key={href} onSelect={() => runCommand(href)}>
              <Icon weight="regular" className="size-4" />
              {label}
              <CommandShortcut>{shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* ── Ajustes ───────────────────────────────────────────────────── */}
        <CommandGroup heading="Ajustes">
          {settingsItems.map(({ label, href, icon: Icon }) => (
            <CommandItem key={href} onSelect={() => runCommand(href)}>
              <Icon weight="regular" className="size-4" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      {/* ── Footer hint ─────────────────────────────────────────────────── */}
      <div className="border-border/40 flex items-center gap-3 border-t px-3 py-2">
        <span className="text-muted-foreground text-xs">
          <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">
            ↑↓
          </kbd>{" "}
          navegar
        </span>
        <span className="text-muted-foreground text-xs">
          <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">
            ↵
          </kbd>{" "}
          seleccionar
        </span>
        <span className="text-muted-foreground text-xs">
          <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">
            Esc
          </kbd>{" "}
          cerrar
        </span>
      </div>
    </CommandDialog>
  );
}
