"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Upload, Pencil, Trash2 } from "lucide-react";

export function MenuManager({ ownerId }: { ownerId: string }) {
  const restaurant = useQuery(api.restaurants.getRestaurantByOwner, { ownerId });
  const menuItems = useQuery(
    api.menu.listMenuItems,
    restaurant ? { restaurantId: restaurant._id } : "skip"
  );

  const createMenuItem = useMutation(api.menu.createMenuItem);
  const updateMenuItem = useMutation(api.menu.updateMenuItem);
  const deleteMenuItem = useMutation(api.menu.deleteMenuItem);
  const setAvailability = useMutation(api.menu.setItemAvailability);
  const bulkImport = useMutation(api.menu.bulkImportMenuItems);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"menuItems"> | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priceString: "", // using string for input handling, stored as paise
    category: "",
    imageUrl: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDialog = (item?: any) => {
    if (item) {
      setEditingId(item._id);
      setFormData({
        name: item.name,
        description: item.description || "",
        priceString: (item.price / 100).toString(),
        category: item.category,
        imageUrl: item.imageUrl || "",
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", description: "", priceString: "", category: "", imageUrl: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!restaurant) return;
    if (!formData.name || !formData.priceString || !formData.category) {
      toast.error("Name, price, and category are required");
      return;
    }

    const priceInPaise = Math.round(parseFloat(formData.priceString) * 100);

    try {
      if (editingId) {
        await updateMenuItem({
          menuItemId: editingId,
          name: formData.name,
          description: formData.description,
          price: priceInPaise,
          category: formData.category,
          imageUrl: formData.imageUrl,
        });
        toast.success("Menu item updated");
      } else {
        await createMenuItem({
          restaurantId: restaurant._id,
          name: formData.name,
          description: formData.description,
          price: priceInPaise,
          category: formData.category,
          imageUrl: formData.imageUrl,
        });
        toast.success("Menu item created");
      }
      setIsDialogOpen(false);
    } catch (e) {
      toast.error("Failed to save menu item");
    }
  };

  const handleDelete = async (id: Id<"menuItems">) => {
    if (confirm("Are you sure you want to delete this item?")) {
      await deleteMenuItem({ menuItemId: id });
      toast.success("Menu item deleted");
    }
  };

  const handleToggleAvailability = async (id: Id<"menuItems">, current: boolean) => {
    await setAvailability({ menuItemId: id, isAvailable: !current });
    toast.success(!current ? "Item marked as available" : "Item marked as out of stock");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !restaurant) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const items = Array.isArray(json) ? json : json.items || [];
        
        const mappedItems = items.map((i: any) => ({
          name: i.name,
          description: i.description || "",
          price: Math.round(parseFloat(i.price || "0") * 100),
          category: i.category || "Uncategorized",
          imageUrl: i.imageUrl || "",
        }));

        if (mappedItems.length === 0) throw new Error("No items found");

        await bulkImport({
          restaurantId: restaurant._id,
          items: mappedItems,
        });
        toast.success(`Successfully imported ${mappedItems.length} items`);
      } catch (err) {
        toast.error("Failed to parse JSON file. Check format.");
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  if (restaurant === undefined || menuItems === undefined) {
    return <div className="p-8">Loading menu...</div>;
  }

  if (restaurant === null) {
    return <div className="p-8">Please complete onboarding first.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-6 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Menu Management</h2>
          <p className="text-muted-foreground">Manage your dishes, categories, and stock availability.</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            accept=".json" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload} 
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Import JSON
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Available</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {menuItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No menu items found. Add one or import a JSON to get started.
                </TableCell>
              </TableRow>
            ) : (
              menuItems.map((item) => (
                <TableRow key={item._id}>
                  <TableCell className="font-medium">
                    {item.name}
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                    )}
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>₹{(item.price / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <Switch 
                      checked={item.isAvailable} 
                      onCheckedChange={() => handleToggleAvailability(item._id, item.isAvailable)} 
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item._id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} Menu Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Item Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  step="1"
                  min="0"
                  value={formData.priceString}
                  onChange={(e) => setFormData({ ...formData, priceString: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g. Starters"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="imageUrl">Image URL (Optional)</Label>
              <Input
                id="imageUrl"
                placeholder="https://..."
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
