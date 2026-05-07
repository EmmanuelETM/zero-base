"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
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

import { createAccountSchema } from "@/lib/validations/accounts";
import { ACCOUNT_TYPES } from "@/lib/constants";
import {
  createAccountAction,
  updateAccountAction,
} from "@/server/actions/accounts";
import { Account } from "@/server/db/types";
import { toUserMessage } from "@/lib/errors";
import { toast } from "sonner";

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

type FormValues = {
  name: string;
  type: (typeof ACCOUNT_TYPES)[number];
  balance: string;
  isOperational: boolean;
};

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
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createAccountSchema) as any,
    defaultValues: {
      name: "",
      type: "checking", // checking es un mejor default
      balance: "0.00",
      isOperational: false,
    },
  });

  // FIX: useEffect síncrono y en el top-level del componente
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

  const onSubmit = (data: FormValues) => {
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
      <DialogContent className="overflow-hidden p-0 sm:max-w-[440px]">
        {/* Header con padding dedicado para un look más limpio */}
        <div className="px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isEditing ? "Editar Cuenta" : "Nueva Cuenta"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Modifica los detalles de esta cuenta."
                : "Agrega una nueva cuenta o bolsillo a tu portafolio."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 pb-6">
          {/* Fila 1: Nombre (Ancho completo) */}
          <Field>
            <FieldLabel htmlFor="name">Nombre de la cuenta</FieldLabel>
            <FieldContent>
              <Input
                id="name"
                placeholder="Ej. Banco BHD - Ahorros"
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              <FieldError errors={[errors.name]} />
            </FieldContent>
          </Field>

          {/* Fila 2: Cuadrícula simétrica para Tipo y Balance */}
          <div className="grid grid-cols-[1fr_1.8fr]">
            <Field>
              <FieldLabel
                htmlFor="type"
                className="text-xs font-medium tracking-wide"
              >
                Tipo
              </FieldLabel>
              <FieldContent>
                <Select
                  value={watch("type")}
                  onValueChange={(val: any) => setValue("type", val)}
                >
                  <SelectTrigger id="type" className="text-sm">
                    <SelectValue placeholder="Selecciona">
                      {watch("type")
                        ? ACCOUNT_TYPE_LABELS[watch("type")?.toLowerCase()] ||
                          watch("type")
                        : "Selecciona"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {ACCOUNT_TYPE_LABELS[type.toLowerCase()] || type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.type]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel
                htmlFor="balance"
                className="text-xs font-medium tracking-wide"
              >
                Balance inicial
              </FieldLabel>
              <FieldContent>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-medium select-none">
                    RD$
                  </span>
                  <Input
                    id="balance"
                    type="number"
                    className="pl-10 text-right font-medium"
                    placeholder="0.00"
                    {...register("balance")}
                    aria-invalid={!!errors.balance}
                  />
                </div>
                <FieldError errors={[errors.balance]} />
              </FieldContent>
            </Field>
          </div>

          {/* Fila 3: Tarjeta de ajustes operacionales */}
          <Field className="border-border/50 bg-muted/20 flex flex-row items-center justify-between rounded-xl border p-4 shadow-sm">
            <div className="space-y-1">
              <FieldLabel
                htmlFor="isOperational"
                className="text-sm leading-none font-medium"
              >
                Cuenta Operativa
              </FieldLabel>
              <div className="text-xs">Se usará para gastos del día a día</div>
            </div>
            <FieldContent className="m-0">
              <Switch
                id="isOperational"
                checked={watch("isOperational")}
                onCheckedChange={(val) => setValue("isOperational", val)}
              />
            </FieldContent>
          </Field>

          {/* Footer del Modal */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : isEditing ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
