"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import DataTable from "@/components/admin/data-table";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const permissions = [
  "products:read", "products:write",
  "orders:read", "orders:write",
  "categories:read", "categories:write",
  "reviews:read", "reviews:write",
  "settings:read", "settings:write",
  "inventory:read", "inventory:write",
  "staff:read", "staff:write",
];

export default function AdminStaffPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [staffPermissions, setStaffPermissions] = useState<string[]>([]);

  const { data: staff, isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () =>
      api.get("/admin/staff?limit=100").then((res) => res.data.data.data ?? []),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/admin/staff", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      toast.success("Staff member created");
      setOpen(false);
      setName(""); setEmail(""); setPassword(""); setRole("staff"); setStaffPermissions([]);
    },
  });

  const togglePermission = (perm: string) => {
    setStaffPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const columns = [
    { header: "Name", accessorKey: "name" },
    { header: "Email", accessorKey: "email" },
    { header: "Role", accessorKey: "role" },
    { header: "Permissions", accessorKey: "permissions", cell: (row: any) => row.permissions?.length || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Staff Management</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Staff</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ name, email, password, role, permissions: staffPermissions }); }} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Role</Label><select className="w-full border rounded-md p-2" value={role} onChange={(e) => setRole(e.target.value)}><option value="staff">Staff</option><option value="admin">Admin</option><option value="superadmin">Super Admin</option></select></div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2">
                  {permissions.map((perm) => (
                    <div key={perm} className="flex items-center justify-between border rounded p-2">
                      <span className="text-sm">{perm}</span>
                      <Switch checked={staffPermissions.includes(perm)} onCheckedChange={() => togglePermission(perm)} />
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full">{createMutation.isPending ? "Creating..." : "Create Staff"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={staff || []} isLoading={isLoading} />
    </div>
  );
}
