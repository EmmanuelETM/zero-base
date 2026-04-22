import { SettingsTabs } from "@/components/features/settings/settings-tabs";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-8 md:py-12">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm">
          Gestiona tu perfil, avatar y preferencias de la aplicación.
        </p>
      </div>

      {/* Tab navigation delegado al cliente */}
      <SettingsTabs />

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
