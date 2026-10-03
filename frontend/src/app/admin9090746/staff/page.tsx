"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import DataTable from "@/components/admin/data-table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, KeyRound, Search } from "lucide-react";

const serverMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.response?.data?.error || fallback;

export default function AdminStaffPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const canManage = currentUser?.role === "super-admin" || currentUser?.role === "admin";

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Create form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");

  // Edit form
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("staff");
  const [editActive, setEditActive] = useState(true);

  // Reset password form
  const [newPassword, setNewPassword] = useState("");

  const { data: staff, isLoading } = useQuery({
    queryKey: ["admin-staff", search],
    queryFn: () =>
      api
        .get(`/admin/staff?limit=100${search ? `&search=${encodeURIComponent(search)}` : ""}`)
        .then((res) => res.data.data.data ?? []),
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => api.get("/admin/staff/roles").then((res) => res.data.data.roles ?? []),
    // Roles endpoint needs staff.manage; staff-role viewers just won't get it.
    retry: false,
  });

  const permissionsFor = (roleName: string): string[] =>
    (roles ?? []).find((r: any) => r.name === roleName)?.permissions ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-staff"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/admin/staff", data),
    onSuccess: () => {
      invalidate();
      toast.success("Staff member created");
      setCreateOpen(false);
      setName(""); setEmail(""); setPhone(""); setPassword(""); setRole("staff");
    },
    onError: (e: any) => toast.error("Could not create staff", { description: serverMessage(e, "Please try again") }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/admin/staff/${id}`, data),
    onSuccess: () => {
      invalidate();
      toast.success("Staff member updated");
      setEditTarget(null);
    },
    onError: (e: any) => toast.error("Could not update staff", { description: serverMessage(e, "Please try again") }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/staff/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success("Staff member deleted");
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error("Could not delete staff", { description: serverMessage(e, "Please try again") }),
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.put(`/admin/staff/${id}/reset-password`, { password }),
    onSuccess: () => {
      toast.success("Password reset successfully");
      setResetTarget(null);
      setNewPassword("");
    },
    onError: (e: any) => toast.error("Could not reset password", { description: serverMessage(e, "Please try again") }),
  });

  const openEdit = (row: any) => {
    setEditTarget(row);
    setEditName(row.name ?? "");
    setEditPhone(row.phone ?? "");
    setEditRole(row.role ?? "staff");
    setEditActive(row.isActive !== false);
  };

  const columns = [
    { header: "Name", accessorKey: "name" },
    { header: "Email", accessorKey: "email" },
    {
      header: "Role",
      accessorKey: "role",
      cell: (row: any) => <Badge variant="secondary" className="capitalize">{row.role}</Badge>,
    },
    {
      header: "Permissions",
      accessorKey: "role",
      cell: (row: any) => {
        const perms = permissionsFor(row.role);
        if (!perms.length) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <span className="text-sm" title={perms.join(", ")}>
            {perms.slice(0, 3).join(", ")}
            {perms.length > 3 ? ` +${perms.length - 3} more` : ""}
          </span>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "isActive",
      cell: (row: any) =>
        row.isActive !== false ? (
          <Badge className="bg-green-600">Active</Badge>
        ) : (
          <Badge variant="destructive">Inactive</Badge>
        ),
    },
    ...(canManage
      ? [
          {
            header: "Actions",
            accessorKey: "_id",
            cell: (row: any) => (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(row)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Reset password" onClick={() => setResetTarget(row)}>
                  <KeyRound className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(row)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold">Staff Management</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name or email"
              className="pl-8 w-56"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {canManage && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Staff</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createMutation.mutate({ name, email, phone, password, role });
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03XX XXXXXXX" /></div>
                  <div className="space-y-2"><Label>Password (min 8 characters)</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <select className="w-full border rounded-md p-2 bg-background" value={role} onChange={(e) => setRole(e.target.value)}>
                      <option value="staff">Staff — orders, products view, inventory, reviews</option>
                      {currentUser?.role === "super-admin" && (
                        <option value="admin">Admin — full store management</option>
                      )}
                    </select>
                    {currentUser?.role !== "super-admin" && (
                      <p className="text-xs text-muted-foreground">Only a super-admin can create admin accounts.</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Staff"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!canManage && (
        <p className="text-sm text-muted-foreground">You have read-only access to the staff list.</p>
      )}

      <DataTable columns={columns} data={staff || []} isLoading={isLoading} />

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Staff Member</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({
                id: editTarget._id,
                data: { name: editName, phone: editPhone, role: editRole, isActive: editActive },
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2"><Label>Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} required minLength={2} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                className="w-full border rounded-md p-2 bg-background"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                disabled={editTarget?.role === "super-admin"}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                {editTarget?.role === "super-admin" && <option value="super-admin">Super Admin</option>}
              </select>
            </div>
            <div className="flex items-center justify-between border rounded p-2">
              <span className="text-sm">Active account</span>
              <Switch checked={editActive} onCheckedChange={setEditActive} />
            </div>
            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && (setResetTarget(null), setNewPassword(""))}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reset Password — {resetTarget?.name}</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              resetMutation.mutate({ id: resetTarget._id, password: newPassword });
            }}
            className="space-y-4"
          >
            <div className="space-y-2"><Label>New password (min 8 characters)</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} /></div>
            <Button type="submit" className="w-full" disabled={resetMutation.isPending}>
              {resetMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete Staff Member?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-medium text-foreground">{deleteTarget?.name} ({deleteTarget?.email})</span>?
            They will immediately lose access. This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteTarget._id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
