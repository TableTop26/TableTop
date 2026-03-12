import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { KitchenClient } from "./kitchen-client";

export default async function KitchenPage() {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  return <KitchenClient ownerId={session.user.sub} />;
}
