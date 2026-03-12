"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ArrowLeft, Plus, Minus, CheckCircle, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";

export function ManualOrderClient({ 
  tableId, 
  ownerId 
}: { 
  tableId: Id<"tables">;
  ownerId: string;
}) {
  const router = useRouter();

  const restaurant = useQuery(api.restaurants.getRestaurantByOwner, { ownerId });
  const menuItems = useQuery(
    api.menu.listMenuItems,
    restaurant ? { restaurantId: restaurant._id } : "skip"
  );
  
  // Table and Session details
  const tables = useQuery(api.tables.listTables, restaurant ? { restaurantId: restaurant._id } : "skip");
  const table = tables?.find((t) => t._id === tableId);
  const activeSession = useQuery(api.sessions.getActiveSession, { tableId });
  const cartItems = useQuery(api.cart.getCartForSession, activeSession ? { sessionId: activeSession._id } : "skip");

  // Mutations
  const createSession = useMutation(api.sessions.createSession);
  const addToCart = useMutation(api.cart.addCartItem);
  const updateQuantity = useMutation(api.cart.updateCartItemQuantity);
  const placeOrder = useMutation(api.orders.placeOrder);

  if (tables === undefined || menuItems === undefined || activeSession === undefined) {
    return <div className="p-8">Loading POS subsystem...</div>;
  }

  if (!table) {
    return <div className="p-8">Table not found.</div>;
  }

  const handleStartSession = async () => {
    if (!restaurant) return;
    try {
      await createSession({
        tableId,
        restaurantId: restaurant._id,
        guestName: "Waiter (Manual)",
        guestPhone: "0000000000",
        cookieToken: "waiter-manual-override-" + Date.now(),
      });
      toast.success("Manual session started");
    } catch (err) {
      toast.error("Failed to start session");
    }
  };

  const handleAddToCart = async (menuItem: any) => {
    if (!activeSession) return;
    try {
      await addToCart({
        sessionId: activeSession._id,
        menuItemId: menuItem._id,
        quantity: 1,
        modifiers: [],
        addedByGuestName: "Waiter",
      });
      toast.success(`Added ${menuItem.name} to cart`);
    } catch (err) {
      toast.error("Failed to add item to cart");
    }
  };

  const handlePlaceOrder = async () => {
    if (!activeSession) return;
    try {
      await placeOrder({ sessionId: activeSession._id });
      toast.success("Order Placed Successfully!");
      router.push("/dashboard/floor"); // Send Waiter back to floor map
    } catch (err) {
      toast.error("Failed to place order");
    }
  };

  const cartTotal = cartItems?.reduce((total, item) => total + (item.menuItem?.price || 0) * item.quantity, 0) || 0;

  // Group menu items by category 
  const menuByCategory = (menuItems || []).reduce((acc, item) => {
    const cat = item.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-card border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/floor")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Manual Order: {table.label}</h1>
            <p className="text-sm text-muted-foreground">Zone: {table.zone || "Main"} • Seats: {table.capacity}</p>
          </div>
        </div>
        {!activeSession ? (
          <Badge variant="secondary" className="bg-neutral-100 text-neutral-600">Available</Badge>
        ) : (
          <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-300">Active Session</Badge>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Side: Menu Items Browser */}
        <div className="flex-1 bg-muted/20">
          {!activeSession ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
              <ShoppingBag className="w-16 h-16 text-muted-foreground/50 mb-6" />
              <h2 className="text-2xl font-bold mb-2">Table is empty</h2>
              <p className="text-muted-foreground mb-8">
                To start adding items to the manual cart, you must first open a virtual session for this table.
              </p>
              <Button size="lg" className="w-full" onClick={handleStartSession}>
                Start Table Session
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-full p-6">
              <div className="space-y-8">
                {Object.entries(menuByCategory).map(([category, items]) => (
                  <div key={category} className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">{category}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      {items.map((item) => (
                        <button
                          key={item._id}
                          disabled={!item.isAvailable}
                          onClick={() => handleAddToCart(item)}
                          className="flex flex-col bg-card border p-4 rounded-xl text-left hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex justify-between items-start w-full mb-2">
                            <span className="font-medium line-clamp-2">{item.name}</span>
                            {!item.isAvailable && <Badge variant="destructive" className="text-[10px] ml-2 shrink-0">Out</Badge>}
                          </div>
                          <span className="text-primary font-bold mt-auto pt-2">
                            ₹{(item.price / 100).toFixed(2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Right Side: Cart Panel */}
        {activeSession && (
          <div className="w-96 bg-card border-l flex flex-col shadow-xl">
            <div className="p-4 border-b bg-muted/20">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" /> Current Order
              </h3>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              {!cartItems || cartItems.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm py-12">
                  No items added yet
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item._id} className="flex flex-col border-b pb-4 last:border-0">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{item.menuItem?.name || "Unknown Item"}</span>
                        <span className="font-semibold">₹{(((item.menuItem?.price || 0) * item.quantity) / 100).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3 bg-muted rounded-full px-2 py-1">
                          <button 
                            className="p-1 hover:bg-white rounded-full transition-colors"
                            onClick={() => updateQuantity({ cartItemId: item._id, quantity: item.quantity - 1 })}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-medium text-sm w-4 text-center">{item.quantity}</span>
                          <button 
                            className="p-1 hover:bg-white rounded-full transition-colors"
                            onClick={() => updateQuantity({ cartItemId: item._id, quantity: item.quantity + 1 })}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="p-6 border-t bg-muted/10 space-y-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span>₹{(cartTotal / 100).toFixed(2)}</span>
              </div>
              <Button 
                size="lg" 
                className="w-full text-lg h-14" 
                disabled={!cartItems || cartItems.length === 0}
                onClick={handlePlaceOrder}
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Place Order
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
