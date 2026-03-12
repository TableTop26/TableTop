"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save } from "lucide-react";

export function SettingsManager({ ownerId }: { ownerId: string }) {
  const restaurant = useQuery(api.restaurants.getRestaurantByOwner, { ownerId });
  const updateRestaurant = useMutation(api.restaurants.updateRestaurant);

  const [formData, setFormData] = useState({
    name: "",
    logoUrl: "",
    hours: "",
    upiQrUrl: "",
    taxRate: "5",
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Populate form data once restaurant loads
    if (restaurant) {
      setFormData({
        name: restaurant.name || "",
        logoUrl: restaurant.logoUrl || "",
        hours: restaurant.hours || "",
        upiQrUrl: restaurant.upiQrUrl || "",
        taxRate: restaurant.taxRate.toString(),
      });
    }
  }, [restaurant]);

  const handleSave = async () => {
    if (!restaurant) return;
    if (!formData.name) {
      toast.error("Restaurant name is required");
      return;
    }

    try {
      setIsLoading(true);
      await updateRestaurant({
        restaurantId: restaurant._id,
        name: formData.name,
        logoUrl: formData.logoUrl,
        hours: formData.hours,
        upiQrUrl: formData.upiQrUrl,
        taxRate: parseFloat(formData.taxRate) || 0,
      });
      toast.success("Settings saved successfully.");
    } catch (error) {
      toast.error("Failed to update settings.");
    } finally {
      setIsLoading(false);
    }
  };

  if (restaurant === undefined) {
    return <div className="p-8">Loading settings...</div>;
  }

  if (restaurant === null) {
    return <div className="p-8">Please complete onboarding first.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-6 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your restaurant profile, billing setup, and defaults.</p>
        </div>
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Global Profile</CardTitle>
            <CardDescription>Public information visible to your guests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                placeholder="https://example.com/logo.png"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Operating Hours</Label>
              <Input
                id="hours"
                placeholder="Mon-Sun, 9AM-10PM"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finance & Payment</CardTitle>
            <CardDescription>Setup your taxes and direct UPI payments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upiQrUrl">Master UPI QR Image URL</Label>
              <Input
                id="upiQrUrl"
                placeholder="https://example.com/upi.png"
                value={formData.upiQrUrl}
                onChange={(e) => setFormData({ ...formData, upiQrUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">This image will be shown on the checkout screen.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">Global Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min="0"
                step="0.1"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
