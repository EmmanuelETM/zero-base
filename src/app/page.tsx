import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to accounts or login will be handled by middleware
  redirect("/accounts");
}
