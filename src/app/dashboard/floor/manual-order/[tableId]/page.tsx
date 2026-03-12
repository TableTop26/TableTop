import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { ManualOrderClient } from "./manual-order-client";

export default async function ManualOrderPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const { tableId } = await params;

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ManualOrderClient tableId={tableId as any} ownerId={session.user.sub} />
    </div>
  );
}
