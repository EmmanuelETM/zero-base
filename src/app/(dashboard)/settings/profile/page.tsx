import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/queries/settings";
import { ProfileForm } from "@/components/features/settings/profile-form";

export const metadata = {
  title: "Perfil — Configuración",
  description: "Edita tu nombre, avatar y moneda base.",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const currency = (["DOP", "USD", "EUR"] as const).includes(
    user.currency as "DOP" | "USD" | "EUR",
  )
    ? (user.currency as "DOP" | "USD" | "EUR")
    : "DOP";

  return (
    <ProfileForm
      defaultValues={{
        fullName: user.fullName,
        currency,
        avatarUrl: user.avatarUrl ?? null,
      }}
    />
  );
}
