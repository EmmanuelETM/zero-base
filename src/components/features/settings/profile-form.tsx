"use client";

import { useTransition, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CameraIcon,
  UserCircleIcon,
  CheckCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

import {
  updateProfileAction,
  uploadAvatarAction,
} from "@/server/actions/settings";
import {
  UpdateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/validations/settings";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileFormProps {
  defaultValues: {
    fullName: string;
    currency: "DOP" | "USD" | "EUR";
    avatarUrl: string | null;
  };
}

// ─── Currency options ─────────────────────────────────────────────────────────

const currencies = [
  { value: "DOP", label: "DOP — Peso Dominicano", symbol: "RD$" },
  { value: "USD", label: "USD — Dólar Estadounidense", symbol: "$" },
  { value: "EUR", label: "EUR — Euro", symbol: "€" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isUploadPending, startUploadTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    defaultValues.avatarUrl,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      fullName: defaultValues.fullName,
      currency: defaultValues.currency,
    },
  });

  // ── Avatar upload ──────────────────────────────────────────────────────────

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optimistic preview
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    const formData = new FormData();
    formData.set("avatar", file);

    startUploadTransition(async () => {
      const result = await uploadAvatarAction(undefined, formData);
      if (result.error) {
        setFeedback({ type: "error", message: result.error });
        // Revert preview on error
        setAvatarPreview(defaultValues.avatarUrl);
      } else {
        setFeedback({ type: "success", message: "Avatar actualizado." });
      }
    });
  }

  // ── Profile save ───────────────────────────────────────────────────────────

  function onSubmit(data: UpdateProfileInput) {
    setFeedback(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("fullName", data.fullName);
      formData.set("currency", data.currency);

      const result = await updateProfileAction(undefined, formData);
      if (result.error) {
        setFeedback({ type: "error", message: result.error });
      } else if (result.message) {
        setFeedback({ type: "success", message: result.message });
      }
    });
  }

  const initials = defaultValues.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* ── Avatar section ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5">
        <button
          type="button"
          id="avatar-trigger"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadPending}
          className="group relative size-20 flex-none overflow-hidden rounded-2xl transition-opacity disabled:opacity-60"
        >
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt="Avatar"
              className="size-full object-cover"
            />
          ) : (
            <div className="bg-primary/10 text-primary flex size-full items-center justify-center text-xl font-semibold">
              {initials || (
                <UserCircleIcon weight="duotone" className="size-9" />
              )}
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <CameraIcon weight="bold" className="size-6 text-white" />
          </div>
        </button>

        <input
          ref={fileInputRef}
          id="avatar-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleAvatarChange}
        />

        <div className="space-y-0.5">
          <p className="text-sm font-medium">Foto de perfil</p>
          <p className="text-muted-foreground text-xs">
            JPG, PNG o WebP · Máximo 5 MB
          </p>
          {isUploadPending && (
            <p className="text-muted-foreground animate-pulse text-xs">
              Subiendo…
            </p>
          )}
        </div>
      </div>

      {/* ── Feedback banner ─────────────────────────────────────────────────── */}
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

      {/* ── Fields ──────────────────────────────────────────────────────────── */}
      <FieldGroup className="space-y-5">
        <Field data-invalid={!!errors.fullName}>
          <FieldLabel htmlFor="fullName">Nombre completo</FieldLabel>
          <Input
            id="fullName"
            placeholder="Ada Lovelace"
            autoComplete="name"
            className="bg-background/50 h-11"
            {...register("fullName")}
          />
          <FieldError errors={[errors.fullName]} />
        </Field>

        <Field data-invalid={!!errors.currency}>
          <FieldLabel htmlFor="currency">Moneda base</FieldLabel>
          <div className="relative">
            <select
              id="currency"
              className="border-input bg-background/50 text-foreground focus:ring-ring h-11 w-full appearance-none rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
              {...register("currency")}
            >
              {currencies.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {/* Chevron icon */}
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg
                className="text-muted-foreground size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
          <FieldError errors={[errors.currency]} />
        </Field>
      </FieldGroup>

      {/* ── Submit ──────────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          type="submit"
          id="save-profile-btn"
          disabled={isPending || !isDirty}
          className="h-10 min-w-[140px] text-sm font-medium"
        >
          {isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
