"use client";

import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  EnvelopeSimpleIcon,
  GithubLogoIcon,
  GoogleLogoIcon,
  EyeClosedIcon,
  EyeIcon,
} from "@phosphor-icons/react";

import { registerAction } from "@/server/actions/auth";
import { RegisterSchema, type RegisterInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  function onSubmit(data: RegisterInput) {
    setServerError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("fullName", data.fullName);
      formData.set("email", data.email);
      formData.set("password", data.password);
      formData.set("confirmPassword", data.confirmPassword);

      const result = await registerAction(undefined, formData);
      if (result?.error) setServerError(result.error);
      if (result?.message) setSuccessMessage(result.message);
    });
  }

  // Estado de Éxito Premium
  if (successMessage) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="border-border/40 bg-card shadow-2xl sm:rounded-2xl">
          <CardContent>
            <div className="flex flex-col items-center space-y-4 py-4 text-center">
              <div className="bg-primary/10 text-primary ring-primary/20 flex size-16 items-center justify-center rounded-2xl ring-1">
                <EnvelopeSimpleIcon weight="duotone" className="size-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">
                  Revisa tu correo
                </h2>
                <p className="text-muted-foreground mx-auto max-w-[280px] text-sm">
                  {successMessage} Haz clic en el enlace de confirmación para
                  activar tu cuenta.
                </p>
              </div>
              <Button
                variant="outline"
                className="mt-4 h-11 w-full font-medium"
              >
                <Link href="/login">Volver al inicio de sesión</Link>
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
        <CardHeader className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Crea tu cuenta</h1>
          <p className="text-muted-foreground text-sm">
            Empieza a gestionar tus finanzas personales
          </p>
        </CardHeader>

        <CardContent className="grid gap-6 px-8">
          {/* Fila de OAuth */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="hover:bg-muted/50 h-11 bg-transparent"
              type="button"
            >
              <GithubLogoIcon className="size-6" />
            </Button>
            <Button
              variant="outline"
              className="hover:bg-muted/50 h-11 bg-transparent"
              type="button"
            >
              <GoogleLogoIcon className="size-6" />
            </Button>
          </div>

          <FieldSeparator className="text-muted-foreground *:data-[slot=field-separator-content]:bg-card text-xs">
            O regístrate con tu correo
          </FieldSeparator>

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

              <Field data-invalid={!!errors.fullName}>
                <FieldLabel htmlFor="fullName">Nombre completo</FieldLabel>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Juan Pérez"
                  autoComplete="name"
                  className="bg-background/50 h-11 p-4"
                  {...register("fullName")}
                />
                <FieldError errors={[errors.fullName]} />
              </Field>

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

              <div className="flex items-center gap-2">
                <Field data-invalid={!!errors.password}>
                  <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mín. 8 caracteres"
                      autoComplete="new-password"
                      className="bg-background/50 h-11 p-4"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                    >
                      {showPassword ? (
                        <EyeClosedIcon className="size-5" />
                      ) : (
                        <EyeIcon className="size-5" />
                      )}
                    </button>
                  </div>
                  <FieldError errors={[errors.password]} />
                </Field>

                <Field data-invalid={!!errors.confirmPassword}>
                  <FieldLabel htmlFor="confirm-password">
                    Confirmar contraseña
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mín. 8 caracteres"
                      autoComplete="new-password"
                      className="bg-background/50 h-11 p-4"
                      {...register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                    >
                      {showPassword ? (
                        <EyeClosedIcon className="size-5" />
                      ) : (
                        <EyeIcon className="size-5" />
                      )}
                    </button>
                  </div>
                  <FieldError errors={[errors.confirmPassword]} />
                </Field>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="h-11 w-full text-base font-medium"
                  disabled={isPending}
                >
                  {isPending ? "Creando cuenta..." : "Crear cuenta"}
                </Button>
              </div>

              <div className="text-muted-foreground mt-4 text-center text-sm">
                ¿Ya tienes cuenta?{" "}
                <Link
                  href="/login"
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  Inicia sesión
                </Link>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
