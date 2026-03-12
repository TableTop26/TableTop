import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { AnalyticsDashboard } from "./analytics-dashboard";

export default async function AnalyticsPage() {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const ownerId = session.user.sub;

  return <AnalyticsDashboard ownerId={ownerId} />;
}
