"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import DataTable from "@/components/admin/data-table";
import { toast } from "sonner";
import { Plus, Trash2, Edit, ImagePlus, X } from "lucide-react";
import { getImageUrl } from "@/lib/utils";

const emptyForm = {
  title: "",
  subtitle: "",
  altText: "",
  link: "",
  position: "hero",
  sortOrder: 0,
  isActive: true,
};

export default function AdminBannersPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageRemoved, setImageRemoved] = useState(false);
  const [altTextManuallyEdited, setAltTextManuallyEdited] = useState(false);

  // Revoke object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Auto-fill altText from title
  useEffect(() => {
    if (form.title && !altTextManuallyEdited) {
      setForm((prev) => ({ ...prev, altText: form.title }));
    }
  }, [form.title, altTextManuallyEdited]);

  const { data: banners, isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: () =>
      api.get("/admin/banners?limit=100").then((res) => res.data.data.data ?? []),
  });

  const saveMutation = useMutation({
    mutationFn: (formData: FormData) => {
      const id = formData.get("_editId");
      const config = { headers: { "Content-Type": "multipart/form-data" } };
      return id
        ? api.put(`/admin/banners/${id}`, formData, config)
        : api.post("/admin/banners", formData, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      toast.success(editingBanner ? "Banner updated" : "Banner created");
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Something went wrong");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      toast.success("Banner deleted (image removed from uploads)");
    },
  });

  const resetForm = () => {
    setForm({ ...emptyForm });
    setImageFile(null);
    setImagePreview("");
    setImageRemoved(false);
    setEditingBanner(null);
    setAltTextManuallyEdited(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setImageFile(file);
    setImageRemoved(false);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    // Existing DB image thi → backend ko remove flag bhejna hoga
    setImageRemoved(!!editingBanner?.image);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openEdit = (banner: any) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      altText: banner.altText || banner.title || "",
      link: banner.link || "",
      position: banner.position || "hero",
      sortOrder: banner.sortOrder ?? 0,
      isActive: banner.isActive ?? true,
    });
    setAltTextManuallyEdited(!!banner.altText);
    setImagePreview(banner.image ? getImageUrl(banner.image) : "");
    setImageFile(null);
    setImageRemoved(false);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("subtitle", form.subtitle);
    fd.append("altText", form.altText);
    fd.append("link", form.link);
    fd.append("position", form.position);
    fd.append("sortOrder", String(form.sortOrder));
    fd.append("isActive", String(form.isActive));
    if (imageFile) fd.append("image", imageFile);
    if (!imageFile && imageRemoved) fd.append("removeImage", "true");
    if (editingBanner) fd.append("_editId", editingBanner._id);
    saveMutation.mutate(fd);
  };

  const columns = [
    {
      header: "Image",
      accessorKey: "image",
      cell: (row: any) =>
        row.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getImageUrl(row.image)}
            alt={row.title}
            className="h-10 w-20 rounded object-cover border"
          />
        ) : (
          <div className="h-10 w-20 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        ),
    },
    { header: "Order", accessorKey: "sortOrder" },
    { header: "Title", accessorKey: "title" },
    { header: "Subtitle", accessorKey: "subtitle" },
    { header: "Link", accessorKey: "link" },
    {
      header: "Status",
      accessorKey: "isActive",
      cell: (row: any) =>
        row.isActive ? (
          <span className="text-green-600 text-sm font-medium">Active</span>
        ) : (
          <span className="text-muted-foreground text-sm">Hidden</span>
        ),
    },
    {
      header: "Actions",
      accessorKey: "_id",
      cell: (row: any) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit">
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm("Delete this banner? Image will also be removed.")) {
                deleteMutation.mutate(row._id);
              }
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Banners</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBanner ? "Edit" : "Create"} Banner</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Image Alt Text</Label>
                <Input
                  value={form.altText}
                  onChange={(e) => {
                    setForm({ ...form, altText: e.target.value });
                    setAltTextManuallyEdited(true);
                  }}
                  placeholder="Auto-filled from title"
                />
                <p className="text-xs text-muted-foreground">Used for SEO and accessibility. Auto-filled from title.</p>
              </div>
              <div className="space-y-2">
                <Label>Link</Label>
                <Input placeholder="/products ya https://..." value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Position</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  >
                    <option value="hero">Hero</option>
                    <option value="middle">Middle</option>
                    <option value="footer">Footer</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={String(form.isActive)}
                    onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })}
                  >
                    <option value="true">Active</option>
                    <option value="false">Hidden</option>
                  </select>
                </div>
              </div>
              {/* Image upload */}
              <div className="space-y-2">
                <Label>Banner Image</Label>
                {imagePreview ? (
                  <div className="relative w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="h-36 w-64 rounded-lg object-cover border" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
                  >
                    <ImagePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload banner image (JPEG, PNG, WEBP — max 5MB)
                    </p>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingBanner ? "Update Banner" : "Create Banner"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={banners || []} isLoading={isLoading} />
    </div>
  );
}
