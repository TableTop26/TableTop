import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { StaffManager } from "./staff-manager";

export default async function StaffPage() {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const ownerId = session.user.sub;

  return <StaffManager ownerId={ownerId} />;
}
