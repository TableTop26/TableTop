"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function PrintQrClient({ ownerId }: { ownerId: string }) {
  const restaurant = useQuery(api.restaurants.getRestaurantByOwner, { ownerId });
  const tables = useQuery(
    api.tables.listTables,
    restaurant ? { restaurantId: restaurant._id } : "skip"
  );

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  if (restaurant === undefined || tables === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        Loading tables…
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-8 text-muted-foreground">Restaurant not found.</div>
    );
  }

  return (
    <>
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/floor">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Print Table QRs</h1>
            <p className="text-sm text-muted-foreground">
              {tables.length} table{tables.length !== 1 ? "s" : ""} •{" "}
              {restaurant.name}
            </p>
          </div>
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Print all
        </Button>
      </div>

      {/* QR grid */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-8">
        {tables
          .slice()
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
          .map((table) => {
            const url = `${baseUrl}/${restaurant._id}/table/${table._id}`;
            return (
              <div
                key={table._id}
                className="flex flex-col items-center gap-3 rounded-xl border bg-white p-5 shadow-sm print:border-2 print:shadow-none print:break-inside-avoid"
              >
                {/* Restaurant name + logo */}
                {restaurant.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={restaurant.logoUrl}
                    alt={restaurant.name}
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">
                    {restaurant.name}
                  </span>
                )}

                <QRCodeSVG
                  value={url}
                  size={160}
                  level="M"
                  includeMargin
                  className="rounded-lg"
                />

                <div className="text-center">
                  <p className="text-xl font-black tracking-tight">
                    {table.label}
                  </p>
                  {table.zone && (
                    <p className="text-xs text-muted-foreground">{table.zone}</p>
                  )}
                </div>

                <p className="text-center text-[10px] text-muted-foreground print:visible break-all px-1">
                  Scan to order
                </p>
              </div>
            );
          })}
      </div>

      {tables.length === 0 && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-muted-foreground">
          <p>No tables found.</p>
          <Link href="/dashboard/floor" className="text-sm underline">
            Add tables in Floor Plan Builder
          </Link>
        </div>
      )}
    </>
  );
}
