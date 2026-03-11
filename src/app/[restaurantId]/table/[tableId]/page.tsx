import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { JoinForm } from "./_components/JoinForm";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function TableLandingPage({
  params,
}: {
  params: Promise<{ restaurantId: string; tableId: string }>;
}) {
  const { restaurantId, tableId } = await params;

  // If guest already has a valid session cookie for this exact table, skip the form
  const cookieStore = await cookies();
  const raw = cookieStore.get("tabletop_guest_token")?.value;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.tableId === tableId) {
        redirect(`/${restaurantId}/table/${tableId}/cart`);
      }
    } catch {
      // malformed cookie — fall through to join form
    }
  }

  const [restaurant, table] = await Promise.all([
    convex.query(api.restaurants.getRestaurantById, {
      restaurantId: restaurantId as Id<"restaurants">,
    }),
    convex.query(api.tables.getTable, {
      tableId: tableId as Id<"tables">,
    }),
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {restaurant?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="mx-auto mb-4 h-16 w-16 rounded-full object-cover"
            />
          )}
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {restaurant?.name ?? "TableTop"}
          </h1>
          {table && (
            <p className="mt-1 text-sm text-zinc-500">
              Table {table.label}
              {table.zone ? ` · ${table.zone}` : ""}
            </p>
          )}
        </div>
        <JoinForm tableId={tableId} restaurantId={restaurantId} />
      </div>
    </main>
  );
}
