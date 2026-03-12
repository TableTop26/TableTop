"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { UtensilsCrossed } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function MenuAvailabilityDrawer({ restaurantId }: { restaurantId: Id<"restaurants"> }) {
  const items = useQuery(api.menu.listMenuItems, { restaurantId });
  const setAvailability = useMutation(api.menu.setItemAvailability);

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <UtensilsCrossed className="h-4 w-4" />
        Menu Availability
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader className="mb-6">
          <SheetTitle>Mark Items Out of Stock</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
          <div className="space-y-4">
            {items === undefined ? (
              <p className="text-sm text-muted-foreground">Loading items...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No menu items found.</p>
            ) : (
              items.map((item: any) => (
                <div 
                  key={item._id} 
                  className={`flex items-center justify-between rounded-lg border p-3 ${!item.isAvailable ? 'bg-muted/50' : ''}`}
                >
                  <div className="flex flex-col gap-1">
                    <span className={`font-medium ${!item.isAvailable ? 'text-muted-foreground line-through' : ''}`}>
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.category}</span>
                  </div>
                  <Switch
                    checked={item.isAvailable}
                    onCheckedChange={(checked) => 
                      setAvailability({ menuItemId: item._id, isAvailable: checked })
                    }
                  />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
