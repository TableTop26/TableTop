import { Sidebar } from "@/components/dashboard/Sidebar";
import { auth0 } from "@/lib/auth0";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function getRole(userId: string, email?: string): Promise<string> {
  try {
    const byId = await convex.query(api.staff.getStaffMemberByUserId, { userId });
    if (byId) return byId.role;
    if (email) {
      const byEmail = await convex.query(api.staff.getStaffByEmail, { email });
      if (byEmail) return byEmail.role;
    }
  } catch {}
  return "owner";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();
  const userId = session?.user?.sub ?? "";
  const claimRole = session?.user?.["https://tabletop.app/role"] as string | undefined;
  const role = claimRole || (userId ? await getRole(userId, session?.user?.email) : "owner");

  // Waiters and chefs get no chrome — just the full-screen page
  if (role === "waiter" || role === "chef") {
    return <div className="h-screen overflow-hidden bg-background">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
