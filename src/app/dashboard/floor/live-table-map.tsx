"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Users, Utensils, CreditCard, RefreshCcw, HandPlatter } from "lucide-react";
import { useRouter } from "next/navigation";

const statusColors: Record<string, string> = {
  OFFLINE: "bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700",
  AVAILABLE: "bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200",
  ORDERING: "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200",
  READY_TO_SERVE: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 shadow-blue-200 shadow-md",
  DINING: "bg-green-100 text-green-800 border-green-300 hover:bg-green-200",
  PAYMENT_PENDING: "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200 shadow-orange-200 shadow-md animate-pulse",
};

const statusLabels: Record<string, string> = {
  OFFLINE: "Offline",
  AVAILABLE: "Available",
  ORDERING: "Ordering",
  READY_TO_SERVE: "Ready to Serve",
  DINING: "Dining",
  PAYMENT_PENDING: "Payment Pending",
};

export function LiveTableMap({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const restaurant = useQuery(api.restaurants.getRestaurantByOwner, { ownerId });
  const tables = useQuery(
    api.tables.listTables,
    restaurant ? { restaurantId: restaurant._id } : "skip"
  );

  const updateTableStatus = useMutation(api.tables.updateTableStatus);
  const clearTable = useMutation(api.tables.clearTable);
  const serveTableOrders = useMutation(api.orders.serveTableOrders);

  const [selectedTableId, setSelectedTableId] = useState<Id<"tables"> | null>(null);

  if (restaurant === undefined || tables === undefined) {
    return <div className="p-8">Loading live map...</div>;
  }

  if (restaurant === null) {
    return <div className="p-8">Please complete onboarding first.</div>;
  }

  const selectedTable = tables.find((t) => t._id === selectedTableId);

  // Group tables by zone
  const tablesByZone = tables.reduce((acc, table) => {
    const zone = table.zone || "Main Dining";
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(table);
    return acc;
  }, {} as Record<string, typeof tables>);

  const handleStatusChange = async (status: any) => {
    if (!selectedTableId) return;
    try {
      // When delivering food, mark all READY kitchen tickets as SERVED
      if (status === "DINING") {
        await serveTableOrders({ tableId: selectedTableId });
      }
      await updateTableStatus({ tableId: selectedTableId, status });
      toast.success(`Table marked as ${statusLabels[status]}`);
      if (status !== "DINING") {
        setSelectedTableId(null);
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleClearTable = async () => {
    if (!selectedTableId) return;
    try {
      await clearTable({ tableId: selectedTableId });
      toast.success("Table cleared for next guests");
      setSelectedTableId(null);
    } catch (error) {
      toast.error("Failed to clear table");
    }
  };

  const navigateToManualOrder = () => {
    if (selectedTableId) {
      router.push(`/dashboard/floor/manual-order/${selectedTableId}`);
    }
  };

  return (
    <div className="space-y-6">
      {Object.keys(tablesByZone).length === 0 ? (
        <div className="text-center py-12 border rounded-md border-dashed bg-card">
          <p className="text-muted-foreground">No tables configured. Use the Floor Plan Builder tab to add tables.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(tablesByZone).map(([zone, zoneTables]) => (
            <div key={zone} className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">{zone}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {zoneTables.map((table) => {
                  const colorClass = statusColors[table.status] || statusColors.AVAILABLE;
                  return (
                    <button
                      key={table._id}
                      onClick={() => setSelectedTableId(table._id)}
                      className={`relative border-2 rounded-xl transition-all flex flex-col items-center justify-center p-6 aspect-square focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${colorClass}`}
                    >
                      <div className="mb-3">
                        <span className="text-2xl font-bold">{table.label}</span>
                      </div>
                      <div className="flex items-center text-sm font-medium opacity-80 mb-2">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{table.capacity}</span>
                      </div>
                      <Badge variant="secondary" className="absolute bottom-2 text-xs bg-white/50 hover:bg-white/60 text-black border-none">
                        {statusLabels[table.status]}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Side Panel */}
      <Sheet open={!!selectedTableId} onOpenChange={(open) => !open && setSelectedTableId(null)}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl flex items-center gap-2">
              Table {selectedTable?.label}
              {selectedTable && (
                <Badge variant="outline" className={statusColors[selectedTable.status].split(" hover")[0]}>
                  {statusLabels[selectedTable.status]}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              Zone: {selectedTable?.zone || "Main Dining"} • Capacity: {selectedTable?.capacity}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
            <div className="space-y-6">
              {/* Contextual Actions Based on State */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium leading-none text-muted-foreground mb-3">Waitstaff Actions</h4>
                
                {selectedTable?.status === "READY_TO_SERVE" && (
                  <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleStatusChange("DINING")}>
                    <HandPlatter className="mr-2 h-5 w-5" />
                    Mark Food Served
                  </Button>
                )}

                {(selectedTable?.status === "AVAILABLE" || selectedTable?.status === "OFFLINE") && (
                  <Button size="lg" className="w-full" onClick={navigateToManualOrder}>
                    <Utensils className="mr-2 h-5 w-5" />
                    Take Manual Order
                  </Button>
                )}

                {selectedTable?.status === "PAYMENT_PENDING" && (
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg bg-orange-50 border-orange-200 text-orange-900 text-sm">
                      Guests have requested the bill. Show them the QR or insert card, then clear the table.
                    </div>
                    {restaurant?.upiQrUrl ? (
                      <div className="rounded-lg border bg-white p-4 flex flex-col items-center gap-2">
                        <p className="text-xs font-medium text-muted-foreground">Show guests this QR to pay</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={restaurant.upiQrUrl}
                          alt="UPI QR"
                          className="h-48 w-48 rounded-lg object-contain"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No UPI QR uploaded. Add one in Settings.
                      </p>
                    )}
                  </div>
                )}

                {selectedTable?.status !== "AVAILABLE" && selectedTable?.status !== "OFFLINE" && (
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full border-green-500 text-green-700 hover:bg-green-50" 
                    onClick={handleClearTable}
                  >
                    <RefreshCcw className="mr-2 h-5 w-5" />
                    Confirm Payment & Mark Clear
                  </Button>
                )}

                <div className="pt-4 mt-6 border-t">
                  <h4 className="text-xs font-medium uppercase text-muted-foreground mb-3">Override Status</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange("OFFLINE")}>Set Offline</Button>
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange("AVAILABLE")}>Set Available</Button>
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange("DINING")}>Set Dining</Button>
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange("PAYMENT_PENDING")}>Set Payment Due</Button>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
