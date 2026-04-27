"use client";

import { useTransition } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  BankIcon,
  PiggyBankIcon,
  MoneyIcon,
  BuildingIcon,
  TrashIcon,
  PencilSimpleIcon,
  ClockCounterClockwiseIcon,
  DotsThreeIcon,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { deleteAccountAction } from "@/server/actions/accounts";
import { Account } from "@/server/db/types";

const ACCOUNT_ICONS: Record<string, React.ElementType> = {
  checking: BankIcon,
  savings: PiggyBankIcon,
  investment: BuildingIcon,
  cooperative: BuildingIcon,
  cash: MoneyIcon,
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: "Nómina / Corriente",
  savings: "Ahorros",
  investment: "Inversión",
  cooperative: "Cooperativa",
  cash: "Efectivo",
};

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
}

export function AccountCard({ account, onEdit }: AccountCardProps) {
  const Icon = ACCOUNT_ICONS[account.type] || BankIcon;
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm("¿Estás seguro de que deseas eliminar esta cuenta?")) {
      startTransition(async () => {
        await deleteAccountAction(account.id);
      });
    }
  };

  return (
    <div className="group border-border/40 bg-background/50 hover:border-primary/30 relative flex flex-col justify-between overflow-hidden rounded-2xl border p-6 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
      <div className="from-primary/5 absolute inset-0 bg-linear-to-br via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl shadow-inner">
            <Icon weight="duotone" className="size-6" />
          </div>
          <div>
            <h3 className="text-foreground font-semibold tracking-tight">
              {account.name}
            </h3>
            <p className="text-muted-foreground text-xs font-medium">
              {ACCOUNT_TYPE_LABELS[account.type] || account.type}{" "}
              {account.isOperational && "(Operativa)"}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={buttonVariants({
              variant: "ghost",
              size: "icon",
              className: "h-8 w-8 rounded-full",
            })}
          >
            <span className="sr-only">Abrir menú</span>
            <DotsThreeIcon className="size-6" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(account)}>
              <PencilSimpleIcon className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isPending}
              className="text-destructive focus:text-destructive"
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              {isPending ? "Eliminando..." : "Eliminar"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative z-10 mt-6 flex items-end justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">
            Balance Actual
          </p>
          <p className="text-foreground text-2xl font-bold tracking-tight">
            {formatCurrency(account.balance)}
          </p>
        </div>

        <div className="text-muted-foreground flex items-center text-xs">
          <ClockCounterClockwiseIcon className="mr-1 h-3 w-3" />
          <span suppressHydrationWarning>
            Actualizado{" "}
            {new Date(account.updatedAt).toLocaleDateString("es-DO", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
