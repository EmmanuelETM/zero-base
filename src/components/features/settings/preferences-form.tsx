"use client";

import { useTransition, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import {
  SunIcon,
  MoonIcon,
  MonitorIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  BellIcon,
  EnvelopeIcon,
  CurrencyDollarIcon,
} from "@phosphor-icons/react";

import { updatePreferencesAction } from "@/server/actions/settings";
import {
  UpdatePreferencesSchema,
  type UpdatePreferencesInput,
} from "@/lib/validations/settings";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreferencesFormProps {
  defaultValues: {
    theme: "light" | "dark" | "system";
    enablePushNotifications: boolean;
    enableEmailNotifications: boolean;
    lowBalanceThreshold: number;
  };
}

// ─── Theme options ────────────────────────────────────────────────────────────

const themeOptions = [
  { value: "light" as const, label: "Claro", icon: SunIcon },
  { value: "dark" as const, label: "Oscuro", icon: MoonIcon },
  { value: "system" as const, label: "Sistema", icon: MonitorIcon },
];

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border/40 space-y-4 rounded-xl border p-5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PreferencesForm({ defaultValues }: PreferencesFormProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const { setTheme } = useTheme();

  const {
    control,
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<UpdatePreferencesInput>({
    resolver: zodResolver(UpdatePreferencesSchema),
    defaultValues,
  });

  function onSubmit(data: UpdatePreferencesInput) {
    setFeedback(null);

    // Apply theme immediately for instant feedback (optimistic)
    setTheme(data.theme);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("theme", data.theme);
      formData.set(
        "enablePushNotifications",
        String(data.enablePushNotifications),
      );
      formData.set(
        "enableEmailNotifications",
        String(data.enableEmailNotifications),
      );
      formData.set("lowBalanceThreshold", String(data.lowBalanceThreshold));

      const result = await updatePreferencesAction(undefined, formData);
      if (result.error) {
        setFeedback({ type: "error", message: result.error });
      } else if (result.message) {
        setFeedback({ type: "success", message: result.message });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ── Feedback ──────────────────────────────────────────────────────── */}
      {feedback && (
        <Alert
          variant={feedback.type === "error" ? "destructive" : "default"}
          className={
            feedback.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 text-destructive border-none"
          }
        >
          {feedback.type === "success" ? (
            <CheckCircleIcon weight="fill" className="size-4" />
          ) : (
            <WarningCircleIcon weight="fill" className="size-4" />
          )}
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      {/* ── Theme picker ──────────────────────────────────────────────────── */}
      <Section label="Apariencia" description="Elige cómo se ve la interfaz.">
        <Controller
          control={control}
          name="theme"
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map(({ value, label, icon: Icon }) => {
                const isSelected = field.value === value;
                return (
                  <button
                    key={value}
                    type="button"
                    id={`theme-${value}`}
                    onClick={() => field.onChange(value)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
                    )}
                  >
                    <Icon
                      weight={isSelected ? "fill" : "regular"}
                      className={cn(
                        "size-5 transition-colors",
                        isSelected ? "text-primary" : "",
                      )}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        />
      </Section>

      {/* ── Notifications ─────────────────────────────────────────────────── */}
      <Section
        label="Notificaciones"
        description="Controla cómo quieres recibir alertas."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-muted flex size-8 items-center justify-center rounded-lg">
                <BellIcon weight="duotone" className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Notificaciones push</p>
                <p className="text-muted-foreground text-xs">
                  Alertas en el navegador
                </p>
              </div>
            </div>
            <Controller
              control={control}
              name="enablePushNotifications"
              render={({ field }) => (
                <Toggle
                  id="toggle-push"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="border-border/40 border-t" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-muted flex size-8 items-center justify-center rounded-lg">
                <EnvelopeIcon weight="duotone" className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Notificaciones por email</p>
                <p className="text-muted-foreground text-xs">
                  Resúmenes y alertas importantes
                </p>
              </div>
            </div>
            <Controller
              control={control}
              name="enableEmailNotifications"
              render={({ field }) => (
                <Toggle
                  id="toggle-email"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </div>
      </Section>

      {/* ── Balance threshold ─────────────────────────────────────────────── */}
      <Section
        label="Alerta de saldo bajo"
        description="Te notificamos cuando el saldo de una cuenta cae por debajo de este monto."
      >
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <CurrencyDollarIcon
              weight="duotone"
              className="text-muted-foreground size-4"
            />
          </div>
          <input
            id="lowBalanceThreshold"
            type="number"
            min={0}
            step={100}
            placeholder="5000"
            className={cn(
              "border-input bg-background/50 text-foreground placeholder:text-muted-foreground h-11 w-full rounded-full border pr-3 pl-9 text-sm",
              "focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none",
              errors.lowBalanceThreshold && "border-destructive",
            )}
            {...register("lowBalanceThreshold", { valueAsNumber: true })}
          />
        </div>
        {errors.lowBalanceThreshold && (
          <p className="text-destructive text-xs">
            {errors.lowBalanceThreshold.message}
          </p>
        )}
      </Section>

      {/* ── Submit ──────────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          type="submit"
          id="save-preferences-btn"
          disabled={isPending}
          className="h-10 min-w-[140px] text-sm font-medium"
        >
          {isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
