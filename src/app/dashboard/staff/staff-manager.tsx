"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Users, UserPlus, Trash2 } from "lucide-react";

export function StaffManager({ ownerId }: { ownerId: string }) {
  const restaurant = useQuery(api.restaurants.getRestaurantByOwner, { ownerId });
  const staffMembers = useQuery(
    api.staff.getStaffByRestaurant,
    restaurant ? { restaurantId: restaurant._id } : "skip"
  );

  const inviteStaff = useMutation(api.staff.inviteStaff);
  const removeStaff = useMutation(api.staff.removeStaff);
  const toggleDuty = useMutation(api.staff.toggleStaffDuty);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleToggleDuty = async (id: Id<"staff">, currentDuty: boolean) => {
    try {
      await toggleDuty({ staffId: id, isOnDuty: !currentDuty });
      toast.success(currentDuty ? "Staff marked Off Duty" : "Staff marked On Duty");
    } catch (e) {
      toast.error("Failed to update duty status");
    }
  };
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "waiter" as "manager" | "waiter" | "chef",
  });

  const handleOpenDialog = () => {
    setFormData({ name: "", email: "", role: "waiter" });
    setIsDialogOpen(true);
  };

  const handleInvite = async () => {
    if (!restaurant) return;
    if (!formData.name || !formData.email || !formData.role) {
      toast.error("Name, email, and role are required");
      return;
    }

    try {
      await inviteStaff({
        restaurantId: restaurant._id,
        name: formData.name,
        email: formData.email,
        role: formData.role,
      });
      toast.success(`Invitation sent to ${formData.name}`);
      setIsDialogOpen(false);
    } catch (e) {
      toast.error("Failed to invite staff member");
    }
  };

  const handleRemove = async (id: Id<"staff">) => {
    if (confirm("Are you sure you want to remove this staff member?")) {
      await removeStaff({ staffId: id });
      toast.success("Staff member removed");
    }
  };

  if (restaurant === undefined || staffMembers === undefined) {
    return <div className="p-8">Loading staff directory...</div>;
  }

  if (restaurant === null) {
    return <div className="p-8">Please complete onboarding first.</div>;
  }

  const roleColors: Record<string, string> = {
    owner: "bg-purple-100 text-purple-800",
    manager: "bg-blue-100 text-blue-800",
    waiter: "bg-green-100 text-green-800",
    chef: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-6 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
          <p className="text-muted-foreground">Manage roles, permissions, and invite new members to your team.</p>
        </div>
        <Button onClick={handleOpenDialog}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Staff
        </Button>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No staff members invited yet.
                </TableCell>
              </TableRow>
            ) : (
              staffMembers.map((member) => (
                <TableRow key={member._id}>
                  <TableCell className="font-medium flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Users className="w-4 h-4 text-muted-foreground" />
                    </div>
                    {member.name}
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={roleColors[member.role] || "bg-gray-100 text-gray-800"}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.role !== "owner" ? (
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={member.isOnDuty ?? false}
                          onCheckedChange={() => handleToggleDuty(member._id, member.isOnDuty ?? false)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {member.isOnDuty ? "On Duty" : "Off Duty"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Always On</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {member.role !== "owner" && (
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(member._id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
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
            <DialogTitle>Invite Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="rahul@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <div className="flex gap-2">
                {(["manager", "waiter", "chef"] as const).map((role) => (
                  <Button
                    key={role}
                    type="button"
                    variant={formData.role === role ? "default" : "outline"}
                    className="flex-1 capitalize"
                    onClick={() => setFormData({ ...formData, role })}
                  >
                    {role}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite}>Send Invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
