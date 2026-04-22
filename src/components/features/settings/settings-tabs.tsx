"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SlidersIcon, UserCircleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const tabs = [
  {
    label: "Perfil",
    href: "/settings/profile",
    icon: UserCircleIcon,
  },
  {
    label: "Preferencias",
    href: "/settings/preferences",
    icon: SlidersIcon,
  },
] as const;

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav className="border-border/50 flex gap-1 border-b">
      {tabs.map(({ label, href, icon: Icon }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
              "after:absolute after:inset-x-0 after:-bottom-px after:h-px",
              isActive
                ? "text-foreground after:bg-foreground"
                : "text-muted-foreground hover:text-foreground after:bg-transparent",
            )}
          >
            <Icon weight={isActive ? "fill" : "regular"} className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
