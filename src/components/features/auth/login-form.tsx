"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  ChartLineUpIcon,
  EyeClosedIcon,
  EyeIcon,
  GithubLogoIcon,
  GoogleLogoIcon,
} from "@phosphor-icons/react";

import { loginAction } from "@/server/actions/auth";
import { LoginSchema, type LoginInput } from "@/lib/validations/auth";
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

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  function onSubmit(data: LoginInput) {
    setServerError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", data.email);
      formData.set("password", data.password);

      const result = await loginAction(undefined, formData);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/40 bg-card shadow-2xl sm:rounded-2xl">
        <CardHeader className="flex flex-col items-center gap-2 pt-4 text-center">
          <div className="bg-primary/10 text-primary ring-primary/20 flex size-14 items-center justify-center rounded-xl ring-1">
            <ChartLineUpIcon strokeWidth={2} className="size-7" />
          </div>
          <div className="mt-2 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Zero Base</h1>
            <p className="text-muted-foreground text-sm">
              ERP Financiero Personal
            </p>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 px-8 pb-4">
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
            O
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

              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Correo Electrónico</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="juan@ejemplo.com"
                  autoComplete="email"
                  className="bg-background/50 h-11 p-4"
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>

              <Field data-invalid={!!errors.password}>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                    tabIndex={-1}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
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

              <div className="pt-2">
                <Button
                  type="submit"
                  className="h-11 w-full text-base font-medium"
                  disabled={isPending}
                >
                  {isPending ? "Iniciando sesión..." : "Iniciar Sesión"}
                </Button>
              </div>

              <div className="text-muted-foreground mt-4 text-center text-sm">
                ¿No tienes una cuenta?{" "}
                <Link
                  href="/register"
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  Regístrate
                </Link>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
