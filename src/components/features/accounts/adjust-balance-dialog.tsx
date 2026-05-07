"use client";

import { useEffect, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InfoIcon } from "@phosphor-icons/react";

import {
  AdjustBalanceInput,
  adjustBalanceSchema,
} from "@/lib/validations/accounts";
import { adjustAccountBalanceAction } from "@/server/actions/accounts";
import { Account } from "@/server/db/types";
import { toUserMessage } from "@/lib/errors";
import { formatCurrency } from "@/lib/formatter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AdjustBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account;
}

export function AdjustBalanceDialog({
  open,
  onOpenChange,
  account,
}: AdjustBalanceDialogProps) {
  const [isPending, startTransition] = useTransition();
  const currentBalance = Number(account.balance || 0);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AdjustBalanceInput>({
    resolver: zodResolver(adjustBalanceSchema),
    defaultValues: {
      accountId: account.id,
      targetBalance: currentBalance,
      reason: "",
    },
  });

  const watchTargetBalance = useWatch({
    control,
    name: "targetBalance",
  });

  const difference = (Number(watchTargetBalance) || 0) - currentBalance;

  useEffect(() => {
    if (open) {
      reset({
        accountId: account.id,
        targetBalance: currentBalance,
        reason: "",
      });
    }
  }, [open, account, reset, currentBalance]);

  const onSubmit = (data: AdjustBalanceInput) => {
    if (difference === 0) {
      toast.info(
        "El balance ingresado es igual al actual. No hay nada que ajustar.",
      );
      onOpenChange(false);
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value) formData.append(key, String(value));
      });

      const result = await adjustAccountBalanceAction(formData);

      if (!result.ok) {
        toast.error(toUserMessage(result.error));
        return;
      }

      toast.success("Balance ajustado correctamente.");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-[420px]">
        <div className="px-6 pt-6 pb-2">
          <DialogHeader className="space-y-3">
            <div>
              <DialogTitle className="text-xl tracking-tight">
                Ajustar Balance
              </DialogTitle>
              <DialogDescription className="mt-1">
                El balance actual de{" "}
                <span className="text-foreground font-medium">
                  {account.name}
                </span>{" "}
                es de{" "}
                <span className="text-foreground font-semibold">
                  {formatCurrency(currentBalance)}
                </span>
                .
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 pb-6">
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="targetBalance">
                Balance de la cuenta
              </FieldLabel>
              <FieldContent>
                <div className="relative flex items-center">
                  <span className="text-muted-foreground absolute left-3.5 text-sm font-medium select-none">
                    RD$
                  </span>
                  <Input
                    id="targetBalance"
                    type="number"
                    className={cn(
                      "h-12 pl-11 text-lg font-medium shadow-sm",
                      errors.targetBalance &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                    {...register("targetBalance", { valueAsNumber: true })}
                    aria-invalid={!!errors.targetBalance}
                  />
                </div>
                <FieldError errors={[errors.targetBalance]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="reason">
                Razón del ajuste{" "}
                <span className="text-muted-foreground font-normal">
                  (Opcional)
                </span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="reason"
                  placeholder="Ej. Corrección de saldo, dinero omitido..."
                  className={cn(
                    "h-10 shadow-sm",
                    errors.reason &&
                      "border-destructive focus-visible:ring-destructive/20",
                  )}
                  {...register("reason")}
                  aria-invalid={!!errors.reason}
                />
                <FieldError errors={[errors.reason]} />
              </FieldContent>
            </Field>
          </div>

          {/* Preview Dinámico de la Transacción */}
          <div className="h-[60px] transition-all duration-300 ease-in-out">
            {difference !== 0 && !isNaN(difference) && (
              <div
                className={cn(
                  "animate-in fade-in slide-in-from-bottom-2 flex items-center gap-3 rounded-xl border p-3 text-sm",
                  difference > 0
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400",
                )}
              >
                <InfoIcon weight="fill" className="size-5 shrink-0" />
                <p className="leading-tight">
                  Se registrará un {difference > 0 ? "ingreso" : "gasto"} de{" "}
                  <span className="font-semibold">
                    {formatCurrency(Math.abs(difference))}
                  </span>{" "}
                  en el historial para cuadrar las cuentas.
                </p>
              </div>
            )}
          </div>

          <div className="border-border/30 flex justify-end gap-3 border-t pt-2">
            <Button
              type="button"
              variant="ghost"
              className="hover:bg-muted"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || difference === 0}
              className="min-w-[120px]"
            >
              {isPending ? "Aplicando..." : "Aplicar ajuste"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
