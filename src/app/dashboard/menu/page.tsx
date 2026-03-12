import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { MenuManager } from "./menu-manager";

export default async function MenuPage() {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const ownerId = session.user.sub;

  return <MenuManager ownerId={ownerId} />;
}
