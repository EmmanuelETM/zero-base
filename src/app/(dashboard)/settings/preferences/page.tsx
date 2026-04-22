import { redirect } from "next/navigation";
import { getCurrentUserPreferences } from "@/server/queries/settings";
import { PreferencesForm } from "@/components/features/settings/preferences-form";

export const metadata = {
  title: "Preferencias — Configuración",
  description: "Personaliza el tema, notificaciones y umbrales de alerta.",
};

export default async function PreferencesPage() {
  const prefs = await getCurrentUserPreferences();

  if (!prefs) redirect("/login");

  const theme = (["light", "dark", "system"] as const).includes(
    prefs.theme as "light" | "dark" | "system",
  )
    ? (prefs.theme as "light" | "dark" | "system")
    : "system";

  return (
    <PreferencesForm
      defaultValues={{
        theme,
        enablePushNotifications: prefs.enablePushNotifications,
        enableEmailNotifications: prefs.enableEmailNotifications,
        lowBalanceThreshold: Number(prefs.lowBalanceThreshold ?? 5000),
      }}
    />
  );
}
