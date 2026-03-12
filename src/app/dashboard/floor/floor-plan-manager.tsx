"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Users, Pencil, Trash2 } from "lucide-react";

export function FloorPlanManager({ ownerId }: { ownerId: string }) {
  const restaurant = useQuery(api.restaurants.getRestaurantByOwner, { ownerId });
  const tables = useQuery(
    api.tables.listTables,
    restaurant ? { restaurantId: restaurant._id } : "skip"
  );

  const createTable = useMutation(api.tables.createTable);
  const updateTable = useMutation(api.tables.updateTable);
  const deleteTable = useMutation(api.tables.deleteTable);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"tables"> | null>(null);
  
  const [formData, setFormData] = useState({
    label: "",
    zone: "",
    capacity: 4,
  });

  const handleOpenDialog = (table?: any) => {
    if (table) {
      setEditingId(table._id);
      setFormData({
        label: table.label,
        zone: table.zone || "",
        capacity: table.capacity,
      });
    } else {
      setEditingId(null);
      setFormData({ label: "", zone: "", capacity: 4 });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!restaurant) return;
    if (!formData.label || formData.capacity < 1) {
      toast.error("Table label and a valid capacity are required");
      return;
    }

    try {
      if (editingId) {
        await updateTable({
          tableId: editingId,
          label: formData.label,
          zone: formData.zone,
          capacity: formData.capacity,
        });
        toast.success("Table updated");
      } else {
        await createTable({
          restaurantId: restaurant._id,
          label: formData.label,
          zone: formData.zone,
          capacity: formData.capacity,
        });
        toast.success("Table created");
      }
      setIsDialogOpen(false);
    } catch (e) {
      toast.error("Failed to save table");
    }
  };

  const handleDelete = async (id: Id<"tables">) => {
    if (confirm("Are you sure you want to delete this table?")) {
      await deleteTable({ tableId: id });
      toast.success("Table deleted");
    }
  };

  if (restaurant === undefined || tables === undefined) {
    return <div className="p-8">Loading floor plan...</div>;
  }

  if (restaurant === null) {
    return <div className="p-8">Please complete onboarding first.</div>;
  }

  // Group tables by zone
  const tablesByZone = tables.reduce((acc, table) => {
    const zone = table.zone || "Main Dining";
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(table);
    return acc;
  }, {} as Record<string, typeof tables>);

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Table
        </Button>
      </div>

      {Object.keys(tablesByZone).length === 0 ? (
        <div className="text-center py-12 border rounded-md border-dashed bg-card mt-4">
          <p className="text-muted-foreground">No tables configured. Add your first table to get started.</p>
        </div>
      ) : (
        <div className="space-y-8 mt-4">
          {Object.entries(tablesByZone).map(([zone, zoneTables]) => (
            <div key={zone} className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">{zone}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {zoneTables.map((table) => (
                  <div 
                    key={table._id}
                    className="relative group border rounded-xl overflow-hidden bg-card hover:border-primary transition-colors cursor-default shadow-sm flex flex-col items-center justify-center p-6 aspect-square"
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenDialog(table)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => handleDelete(table._id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-3">
                      <span className="text-xl font-bold">{table.label}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground text-sm font-medium">
                      <Users className="w-4 h-4 mr-1" />
                      <span>{table.capacity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="label">Table Label</Label>
                <Input
                  id="label"
                  placeholder="e.g. T1, Bar 1"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="capacity">Capacity (Seats)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zone">Zone (Optional)</Label>
              <Input
                id="zone"
                placeholder="e.g. Main Hall, Patio"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Table</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
