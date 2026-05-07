"use client";

import { useEffect, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { FloppyDiskIcon, SpinnerIcon } from "@phosphor-icons/react";

import {
  CreateAccountInput,
  createAccountSchema,
} from "@/lib/validations/accounts";
import { ACCOUNT_TYPES } from "@/lib/constants";
import {
  createAccountAction,
  updateAccountAction,
} from "@/server/actions/accounts";
import { Account } from "@/server/db/types";
import { toUserMessage } from "@/lib/errors";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: "Corriente",
  savings: "Ahorros",
  investment: "Inversión",
  cooperative: "Cooperativa",
  cash: "Efectivo",
};

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
}: AccountFormDialogProps) {
  const isEditing = !!account;
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control, // <-- Extraemos control
    reset,
    formState: { errors },
  } = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      name: "",
      type: "checking",
      balance: "0.00",
      isOperational: false,
    },
  });

  useEffect(() => {
    if (open) {
      if (account) {
        reset({
          name: account.name,
          type: account.type,
          balance: account.balance.toString(),
          isOperational: account.isOperational,
        });
      } else {
        reset({
          name: "",
          type: "checking",
          balance: "0.00",
          isOperational: false,
        });
      }
    }
  }, [open, account, reset]);

  const onSubmit = (data: CreateAccountInput) => {
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      const result = isEditing
        ? await updateAccountAction(account.id, formData)
        : await createAccountAction(formData);

      if (!result.ok) {
        toast.error(toUserMessage(result.error));
        return;
      }

      toast.success(isEditing ? "Cuenta actualizada." : "Cuenta creada.");
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
                {isEditing ? "Editar Cuenta" : "Nueva Cuenta"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {isEditing
                  ? "Modifica los detalles de esta cuenta."
                  : "Agrega una nueva cuenta o bolsillo a tu portafolio."}
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 pb-6">
          <Field>
            <FieldLabel htmlFor="name">Nombre de la cuenta</FieldLabel>
            <FieldContent>
              <Input
                id="name"
                placeholder="Ej. Banco BHD - Ahorros"
                className={cn(
                  "h-11 shadow-sm",
                  errors.name &&
                    "border-destructive focus-visible:ring-destructive/20",
                )}
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              <FieldError errors={[errors.name]} />
            </FieldContent>
          </Field>

          <div
            className={cn(
              "grid items-start gap-4", // <-- items-start evita que se deformen
              !isEditing ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            <Field className="flex min-w-0 flex-col justify-start">
              <FieldLabel htmlFor="type">Tipo</FieldLabel>
              <FieldContent>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="type"
                        className={cn(
                          "h-11 w-full text-left shadow-sm transition-colors [&>span]:truncate",
                          errors.type &&
                            "border-destructive focus:ring-destructive/20",
                        )}
                      >
                        <SelectValue placeholder="Selecciona">
                          {field.value
                            ? ACCOUNT_TYPE_LABELS[field.value] || field.value
                            : "Selecciona"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {ACCOUNT_TYPE_LABELS[type] || type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.type]} />
              </FieldContent>
            </Field>

            {/* Solo mostramos el campo de balance si NO estamos editando */}
            {!isEditing && (
              <Field className="flex min-w-0 flex-col justify-start">
                <FieldLabel htmlFor="balance">Balance inicial</FieldLabel>
                <FieldContent>
                  {/* Fijamos la altura aquí en el wrapper para igualar al Select */}
                  <div className="relative flex h-11 items-center">
                    <span className="text-muted-foreground absolute left-3.5 text-sm font-medium select-none">
                      RD$
                    </span>
                    <Input
                      id="balance"
                      type="number"
                      className={cn(
                        "h-full w-full pl-11 text-right font-medium shadow-sm", // <-- h-full para que herede del wrapper
                        errors.balance &&
                          "border-destructive focus-visible:ring-destructive/20",
                      )}
                      placeholder="0.00"
                      {...register("balance")}
                      aria-invalid={!!errors.balance}
                    />
                  </div>
                  <FieldError errors={[errors.balance]} />
                </FieldContent>
              </Field>
            )}
          </div>

          <div className="border-border/40 bg-muted/10 overflow-hidden rounded-xl border shadow-sm transition-all">
            <Field className="flex flex-row items-center justify-between p-4">
              <div className="space-y-0.5">
                <FieldLabel
                  htmlFor="isOperational"
                  className="text-sm leading-none font-medium"
                >
                  Cuenta Operativa
                </FieldLabel>
                <div className="text-muted-foreground text-xs">
                  Se usará para gastos del día a día
                </div>
              </div>
              <FieldContent className="m-0">
                <Controller
                  control={control}
                  name="isOperational"
                  render={({ field }) => (
                    <Switch
                      id="isOperational"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </FieldContent>
            </Field>
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
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                  <span>{isEditing ? "Guardando..." : "Creando..."}</span>
                </>
              ) : (
                <>
                  <FloppyDiskIcon className="mr-2 h-4 w-4" />
                  <span>{isEditing ? "Guardar" : "Crear"}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
