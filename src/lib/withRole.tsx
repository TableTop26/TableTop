import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

type Role = "owner" | "manager" | "waiter" | "chef";

interface WithRoleProps {
  allowedRoles: Role[];
  children: ReactNode;
}

export async function WithRole({ allowedRoles, children }: WithRoleProps) {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  // Read custom claim from Auth0 token
  const userRole = (session.user["https://tabletop.app/role"] || "owner") as Role;

  if (!allowedRoles.includes(userRole)) {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}
