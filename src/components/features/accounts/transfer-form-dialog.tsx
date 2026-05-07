"use client";

import { useEffect, useTransition } from "react";
import { useForm, useWatch, Controller } from "react-hook-form"; // <-- Importamos Controller
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowsLeftRightIcon, SpinnerIcon } from "@phosphor-icons/react";

import {
  CreateTransferInput,
  createTransferSchema,
} from "@/lib/validations/transfers";
import { createTransferAction } from "@/server/actions/transfers";
import { Account } from "@/server/db/types";
import { toUserMessage } from "@/lib/errors";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatter";

interface TransferFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
}

export function TransferFormDialog({
  open,
  onOpenChange,
  accounts,
}: TransferFormDialogProps) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control, // <-- Usamos control en lugar de setValue
    reset,
    formState: { errors },
  } = useForm<CreateTransferInput>({
    resolver: zodResolver(createTransferSchema),
    defaultValues: {
      fromAccountId: "",
      toAccountId: "",
      amount: "",
      applyCommission: false,
      commissionAmount: "100.00",
      description: "Transferencia",
    },
  });

  // Los useWatch se quedan porque los necesitamos para la UI (nombres y dependencias)
  const applyCommission = useWatch({
    control,
    name: "applyCommission",
  });
  const fromAccountId = useWatch({
    control,
    name: "fromAccountId",
  });
  const toAccountId = useWatch({
    control,
    name: "toAccountId",
  });

  const selectedFromAccount = accounts.find((a) => a.id === fromAccountId);
  const selectedToAccount = accounts.find((a) => a.id === toAccountId);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = (data: CreateTransferInput) => {
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      const result = await createTransferAction(formData);

      if (!result.ok) {
        toast.error(toUserMessage(result.error));
        return;
      }

      toast.success("Transferencia realizada con éxito.");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-[460px]">
        <div className="px-6 pt-6 pb-2">
          <DialogHeader className="space-y-3">
            <div>
              <DialogTitle className="text-xl tracking-tight">
                Transferir Fondos
              </DialogTitle>
              <DialogDescription className="mt-1">
                Mueve dinero entre tus cuentas y bolsillos.
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        {/* Quitamos el 'as any' del handleSubmit */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 pb-6">
          <div className="grid grid-cols-2 gap-4">
            <Field className="min-w-0">
              <FieldLabel htmlFor="fromAccountId">Origen</FieldLabel>
              <FieldContent>
                {/* Reemplazado por Controller */}
                <Controller
                  control={control}
                  name="fromAccountId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="fromAccountId"
                        className={cn(
                          "h-10 w-full text-left transition-colors [&>span]:truncate",
                          errors.fromAccountId &&
                            "border-destructive focus:ring-destructive/20",
                        )}
                      >
                        <SelectValue placeholder="Cuenta origen">
                          {selectedFromAccount
                            ? selectedFromAccount.name
                            : "Cuenta origen"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                            <span className="text-muted-foreground ml-1">
                              ({formatCurrency(acc.balance ?? 0)})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.fromAccountId]} />
              </FieldContent>
            </Field>

            <Field className="min-w-0">
              <FieldLabel htmlFor="toAccountId">Destino</FieldLabel>
              <FieldContent>
                {/* Reemplazado por Controller */}
                <Controller
                  control={control}
                  name="toAccountId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="toAccountId"
                        className={cn(
                          "h-10 w-full text-left transition-colors [&>span]:truncate",
                          errors.toAccountId &&
                            "border-destructive focus:ring-destructive/20",
                        )}
                      >
                        <SelectValue placeholder="Cuenta destino">
                          {selectedToAccount
                            ? selectedToAccount.name
                            : "Cuenta destino"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem
                            key={acc.id}
                            value={acc.id}
                            disabled={fromAccountId === acc.id}
                          >
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.toAccountId]} />
              </FieldContent>
            </Field>
          </div>

          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="amount">Monto a Transferir</FieldLabel>
              <FieldContent>
                <div className="relative flex items-center">
                  <span className="text-muted-foreground absolute left-3.5 text-sm font-medium select-none">
                    RD$
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    className={cn(
                      "h-12 pl-11 text-lg font-medium shadow-sm",
                      errors.amount &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                    placeholder="0.00"
                    {...register("amount")}
                    aria-invalid={!!errors.amount}
                  />
                </div>
                <FieldError errors={[errors.amount]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Descripción</FieldLabel>
              <FieldContent>
                <Input
                  id="description"
                  placeholder="Ej. Pago de tarjeta, ahorro..."
                  className={cn(
                    "h-10 shadow-sm",
                    errors.description &&
                      "border-destructive focus-visible:ring-destructive/20",
                  )}
                  {...register("description")}
                  aria-invalid={!!errors.description}
                />
                <FieldError errors={[errors.description]} />
              </FieldContent>
            </Field>
          </div>

          <div className="border-border/40 bg-muted/10 overflow-hidden rounded-xl border shadow-sm transition-all">
            <Field className="flex flex-row items-center justify-between p-4">
              <div className="space-y-0.5">
                <FieldLabel
                  htmlFor="applyCommission"
                  className="text-sm leading-none font-medium"
                >
                  Aplicar Comisión LBTR
                </FieldLabel>
                <div className="text-muted-foreground text-xs">
                  Costo por transferencia interbancaria
                </div>
              </div>
              <FieldContent className="m-0">
                {/* Reemplazado por Controller */}
                <Controller
                  control={control}
                  name="applyCommission"
                  render={({ field }) => (
                    <Switch
                      id="applyCommission"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </FieldContent>
            </Field>

            {applyCommission && (
              <div className="border-border/40 bg-background/50 animate-in fade-in slide-in-from-top-2 border-t p-4">
                <Field>
                  <FieldLabel htmlFor="commissionAmount">
                    Monto de la Comisión
                  </FieldLabel>
                  <FieldContent>
                    <div className="relative flex items-center">
                      <span className="text-muted-foreground absolute left-3 text-xs font-medium select-none">
                        RD$
                      </span>
                      <Input
                        id="commissionAmount"
                        type="number"
                        className={cn(
                          "h-9 pl-9 text-sm shadow-sm",
                          errors.commissionAmount &&
                            "border-destructive focus-visible:ring-destructive/20",
                        )}
                        {...register("commissionAmount")}
                        aria-invalid={!!errors.commissionAmount}
                      />
                    </div>
                    <FieldError errors={[errors.commissionAmount]} />
                  </FieldContent>
                </Field>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="hover:bg-muted py-4"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="min-w-[120px] py-4"
            >
              {isPending ? (
                <>
                  <SpinnerIcon className="mr-2 size-4 animate-spin" />
                  <span className="sr-only">Procesando...</span>
                </>
              ) : (
                <>
                  <ArrowsLeftRightIcon className="mr-2 size-4" />
                  <span>Transferir</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
