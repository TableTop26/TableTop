"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SessionGuard } from "../_components/SessionGuard";

function formatPrice(paise: number) {
  return `₹${(paise / 100).toFixed(2)}`;
}

export default function CartPage() {
  const params = useParams<{ restaurantId: string; tableId: string }>();
  const router = useRouter();
  const { restaurantId, tableId } = params;

  const [guestName, setGuestName] = useState("Guest");
  const [cartOpen, setCartOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("tabletop_guest_name");
    if (stored) setGuestName(stored);
  }, []);

  const session = useQuery(api.sessions.getActiveSession, {
    tableId: tableId as Id<"tables">,
  });

  const menuItems = useQuery(api.menu.listMenuItems, {
    restaurantId: restaurantId as Id<"restaurants">,
  });

  const cart = useQuery(
    api.cart.getCartForSession,
    session?._id ? { sessionId: session._id } : "skip"
  );

  const addItem = useMutation(api.cart.addCartItem);
  const updateQty = useMutation(api.cart.updateCartItemQuantity);
  const placeOrder = useMutation(api.orders.placeOrder);

  // Group menu items by category
  const grouped = useMemo(() => {
    if (!menuItems) return {};
    return menuItems.reduce<Record<string, typeof menuItems>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [menuItems]);

  // Cart totals
  const cartCount = cart?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const cartTotal = cart?.reduce((s, i) => s + (i.menuItem?.price ?? 0) * i.quantity, 0) ?? 0;

  function getCartQty(menuItemId: Id<"menuItems">) {
    return cart?.find((c) => c.menuItemId === menuItemId)?.quantity ?? 0;
  }

  async function handleAdd(menuItemId: Id<"menuItems">) {
    if (!session?._id) return;
    await addItem({
      sessionId: session._id,
      menuItemId,
      quantity: 1,
      modifiers: [],
      addedByGuestName: guestName,
    });
  }

  async function handleQtyChange(cartItemId: Id<"cartItems">, delta: number, current: number) {
    await updateQty({ cartItemId, quantity: current + delta });
  }

  async function handlePlaceOrder() {
    if (!session?._id) return;
    setPlacingOrder(true);
    try {
      await placeOrder({ sessionId: session._id });
      toast.success("Order placed!");
      setCartOpen(false);
      router.push(`/${restaurantId}/table/${tableId}/tracking`);
    } catch (err) {
      toast.error("Couldn't place order. Try again.");
      setPlacingOrder(false);
    }
  }

  return (
    <SessionGuard tableId={tableId} restaurantId={restaurantId}>
      <div className="min-h-screen bg-zinc-50 pb-24">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-xl items-center justify-between">
            <h1 className="font-semibold text-zinc-900">Menu</h1>
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <Button
                variant="outline"
                size="sm"
                className="relative gap-2"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="h-4 w-4" />
                {cartCount > 0 && (
                  <Badge className="px-1.5 py-0 text-xs">{cartCount}</Badge>
                )}
              </Button>
              <SheetContent side="right" className="flex w-full flex-col sm:max-w-sm">
                <SheetHeader>
                  <SheetTitle>Your cart</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto py-4">
                  {!cart || cart.length === 0 ? (
                    <p className="text-center text-sm text-zinc-400 mt-8">
                      Your cart is empty. Add items from the menu.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {cart.map((item) => (
                        <li key={item._id} className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-900">
                              {item.menuItem?.name}
                            </p>
                            {item.modifiers.length > 0 && (
                              <p className="text-xs text-zinc-400">
                                {item.modifiers.join(", ")}
                              </p>
                            )}
                            <p className="text-xs text-zinc-500">
                              {formatPrice(item.menuItem?.price ?? 0)} · by {item.addedByGuestName}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              className="rounded p-1 hover:bg-zinc-100"
                              onClick={() => handleQtyChange(item._id, -1, item.quantity)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-5 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <button
                              className="rounded p-1 hover:bg-zinc-100"
                              onClick={() => handleQtyChange(item._id, 1, item.quantity)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {cart && cart.length > 0 && (
                  <div className="border-t border-zinc-200 pt-4">
                    <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                      <span>Subtotal</span>
                      <span>{formatPrice(cartTotal)}</span>
                    </div>
                    <Button
                      className="w-full"
                      disabled={placingOrder}
                      onClick={handlePlaceOrder}
                    >
                      {placingOrder ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {placingOrder ? "Placing order…" : "Place Order"}
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Menu */}
        <main className="mx-auto max-w-xl px-4 pt-6">
          {menuItems === undefined ? (
            <div className="flex justify-center py-16 text-zinc-400 text-sm">Loading menu…</div>
          ) : menuItems.length === 0 ? (
            <p className="text-center text-zinc-400 text-sm py-16">Menu is empty.</p>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <section key={category} className="mb-8">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {category}
                </h2>
                <ul className="space-y-3">
                  {items.map((item) => {
                    const qty = getCartQty(item._id);
                    return (
                      <li
                        key={item._id}
                        className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100"
                      >
                        {item.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-zinc-900">{item.name}</p>
                          {item.description && (
                            <p className="mt-0.5 text-xs text-zinc-400 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <p className="mt-1 text-sm font-semibold text-zinc-700">
                            {formatPrice(item.price)}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {!item.isAvailable ? (
                            <Badge variant="secondary" className="text-xs">
                              Unavailable
                            </Badge>
                          ) : qty === 0 ? (
                            <button
                              onClick={() => handleAdd(item._id)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-800 text-zinc-800 hover:bg-zinc-800 hover:text-white transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  const cartItem = cart?.find((c) => c.menuItemId === item._id);
                                  if (cartItem) handleQtyChange(cartItem._id, -1, cartItem.quantity);
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                              <button
                                onClick={() => handleAdd(item._id)}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-white hover:bg-zinc-700"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <Separator className="mt-6" />
              </section>
            ))
          )}
        </main>

        {/* Sticky cart bar */}
        {cartCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white p-4 shadow-lg">
            <div className="mx-auto max-w-xl">
              <Button className="w-full gap-3" onClick={() => setCartOpen(true)}>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {cartCount}
                </Badge>
                View Cart
                <span className="ml-auto">{formatPrice(cartTotal)}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </SessionGuard>
  );
}
