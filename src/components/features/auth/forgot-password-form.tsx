"use client";

import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  ArrowLeftIcon,
  EnvelopeSimpleIcon,
  EnvelopeSimpleOpenIcon,
} from "@phosphor-icons/react";

import { forgotPasswordAction } from "@/server/actions/auth";
import {
  ForgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  function onSubmit(data: ForgotPasswordInput) {
    setServerError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", data.email);

      const result = await forgotPasswordAction(undefined, formData);
      if (result?.error) setServerError(result.error);
      if (result?.message) setSuccessMessage(result.message);
    });
  }

  // Estado de Éxito Premium
  if (successMessage) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="border-border/40 bg-card shadow-2xl sm:rounded-2xl">
          <CardContent className="pt-10 pb-10">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="bg-primary/10 text-primary ring-primary/20 flex size-16 items-center justify-center rounded-2xl ring-1">
                <EnvelopeSimpleOpenIcon weight="duotone" className="size-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">
                  Revisa tu correo
                </h2>
                <p className="text-muted-foreground mx-auto max-w-[280px] text-sm">
                  {successMessage}
                </p>
              </div>
              <Button
                variant="outline"
                className="mt-4 h-11 w-full font-medium"
              >
                <Link href="/login" className="flex items-center gap-2">
                  <ArrowLeftIcon weight="bold" className="size-4" />
                  Volver al inicio de sesión
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/40 bg-card shadow-2xl sm:rounded-2xl">
        <CardHeader className="flex flex-col items-center gap-2 pt-4 pb-6 text-center">
          <div className="bg-primary/10 text-primary ring-primary/20 flex size-14 items-center justify-center rounded-xl ring-1">
            <EnvelopeSimpleIcon weight="duotone" className="size-7" />
          </div>
          <div className="mt-2 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              Recuperar acceso
            </h1>
            <p className="text-muted-foreground mx-auto max-w-[280px] text-sm">
              Ingresa tu correo y te enviaremos un enlace para crear una nueva
              contraseña.
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <FieldGroup>
              {serverError && (
                <Alert
                  variant="destructive"
                  className="bg-destructive/10 text-destructive border-none"
                >
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  className="bg-background/50 h-11 p-4"
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>

              <div className="space-y-4 pt-2">
                <Button
                  type="submit"
                  className="h-11 w-full text-base font-medium"
                  disabled={isPending}
                >
                  {isPending ? "Enviando..." : "Enviar enlace"}
                </Button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
                  >
                    <ArrowLeftIcon weight="bold" className="size-3.5" />
                    Volver al inicio de sesión
                  </Link>
                </div>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
