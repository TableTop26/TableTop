"use client";

import dynamic from "next/dynamic";

const MenuAvailabilityDrawer = dynamic(
  () =>
    import("@/components/dashboard/MenuAvailabilityDrawer").then(
      (m) => m.MenuAvailabilityDrawer
    ),
  { ssr: false, loading: () => null }
);

export function MenuAvailabilityDrawerWrapper({ ownerId }: { ownerId: string }) {
  return <MenuAvailabilityDrawer ownerId={ownerId} />;
}
