"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function OnboardingForm({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const createRestaurant = useMutation(api.restaurants.createRestaurant);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    logoUrl: "",
    upiQrUrl: "",
    taxRate: 5,
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleNext = () => setStep((s) => Math.min(s + 1, 3));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Restaurant name is required");
      return;
    }
    try {
      setIsLoading(true);
      await createRestaurant({
        name: formData.name,
        ownerId,
        taxRate: formData.taxRate,
      });
      // Optionally update other details if added to createRestaurant args or via a subsequent update call
      toast.success("Welcome aboard! Restaurant profile created.");
      router.push("/dashboard/settings");
    } catch (error) {
      toast.error("Failed to create profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle>Welcome to TableTop</CardTitle>
          <CardDescription>Let's set up your restaurant in just a few steps.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-2 flex-1 rounded ${step >= s ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="space-y-2">
                <Label htmlFor="name">Restaurant Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g. The Grand Cafe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL (Optional)</Label>
                <Input
                  id="logoUrl"
                  placeholder="https://example.com/logo.png"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
              <h3 className="text-lg font-medium">Payment Details</h3>
              <p className="text-xs text-muted-foreground">We use your custom UPI QR code so guests pay you directly.</p>
              <div className="space-y-2">
                <Label htmlFor="upiQrUrl">UPI QR Image URL (Optional)</Label>
                <Input
                  id="upiQrUrl"
                  placeholder="https://example.com/qr.png"
                  value={formData.upiQrUrl}
                  onChange={(e) => setFormData({ ...formData, upiQrUrl: e.target.value })}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
              <h3 className="text-lg font-medium">Financial Settings</h3>
              <div className="space-y-2">
                <Label htmlFor="taxRate">Global Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Default tax applied to all orders.</p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={step === 1}>
            Back
          </Button>
          {step < 3 ? (
            <Button onClick={handleNext}>Next Step</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading || !formData.name}>
              {isLoading ? "Saving..." : "Complete Setup"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
