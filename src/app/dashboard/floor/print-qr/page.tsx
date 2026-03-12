import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { PrintQrClient } from "./print-qr-client";

export default async function PrintQrPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login");

  return <PrintQrClient ownerId={session.user.sub} />;
}
