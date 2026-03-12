import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { SettingsManager } from "./settings-manager";

export default async function SettingsPage() {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const ownerId = session.user.sub;

  return <SettingsManager ownerId={ownerId} />;
}
