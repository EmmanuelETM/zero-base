"use client";

import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeClosedIcon, EyeIcon, LockKeyIcon } from "@phosphor-icons/react";

import { resetPasswordAction } from "@/server/actions/auth";
import {
  ResetPasswordSchema,
  type ResetPasswordInput,
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

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // Estados independientes para mostrar cada contraseña
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
  });

  function onSubmit(data: ResetPasswordInput) {
    setServerError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("password", data.password);
      formData.set("confirmPassword", data.confirmPassword);

      const result = await resetPasswordAction(undefined, formData);
      if (result?.error) setServerError(result.error);
    });
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/40 bg-card shadow-2xl sm:rounded-2xl">
        <CardHeader className="flex flex-col items-center gap-2 py-4 text-center">
          <div className="bg-primary/10 text-primary ring-primary/20 flex size-14 items-center justify-center rounded-xl ring-1">
            <LockKeyIcon weight="duotone" className="size-7" />
          </div>
          <div className="mt-2 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              Nueva contraseña
            </h1>
            <p className="text-muted-foreground text-sm">
              Elige una contraseña segura para tu cuenta
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

              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">Nueva contraseña</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mín. 8 caracteres"
                    autoComplete="new-password"
                    className="bg-background/50 h-11 pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                  >
                    {showPassword ? (
                      <EyeClosedIcon weight="regular" className="size-5" />
                    ) : (
                      <EyeIcon weight="regular" className="size-5" />
                    )}
                  </button>
                </div>
                <FieldError errors={[errors.password]} />
              </Field>

              <Field data-invalid={!!errors.confirmPassword}>
                <FieldLabel htmlFor="confirmPassword">
                  Confirmar contraseña
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                    className="bg-background/50 h-11 pr-10"
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeClosedIcon weight="regular" className="size-5" />
                    ) : (
                      <EyeIcon weight="regular" className="size-5" />
                    )}
                  </button>
                </div>
                <FieldError errors={[errors.confirmPassword]} />
              </Field>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="h-11 w-full text-base font-medium"
                  disabled={isPending}
                >
                  {isPending ? "Guardando..." : "Establecer nueva contraseña"}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
