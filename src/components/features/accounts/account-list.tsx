"use client";

import { useState } from "react";
import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { AccountCard } from "./account-card";
import { AccountFormDialog } from "./account-form-dialog";
import { Account } from "@/server/db/types";

interface AccountListProps {
  accounts: Account[];
}

export function AccountList({ accounts }: AccountListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const handleCreate = () => {
    setEditingAccount(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Cuentas y Bolsillos
          </h2>
          <p className="text-muted-foreground">
            Administra tus cuentas bancarias y ahorros.
          </p>
        </div>
        <Button onClick={handleCreate} size="icon" className="h-10 w-10">
          <PlusIcon className="h-4 w-4" weight="bold" />
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <AccountCard key={account.id} account={account} onEdit={handleEdit} />
        ))}
        {accounts.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
            <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-full">
              <PlusIcon className="size-6" />
            </div>
            <h3 className="text-lg font-semibold">No hay cuentas</h3>
            <p className="text-muted-foreground mt-1 mb-4 max-w-sm text-sm">
              Aún no has agregado ninguna cuenta. Crea tu primer bolsillo para
              comenzar a administrar tu dinero.
            </p>
            <Button onClick={handleCreate} variant="outline">
              Crear mi primera cuenta
            </Button>
          </div>
        )}
      </div>

      <AccountFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        account={editingAccount}
      />
    </div>
  );
}
