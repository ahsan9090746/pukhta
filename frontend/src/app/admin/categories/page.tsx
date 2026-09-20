"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DataTable from "@/components/admin/data-table";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ImagePlus, X, Eye } from "lucide-react";
import { getImageUrl } from "@/lib/utils";
import Link from "next/link";

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageRemoved, setImageRemoved] = useState(false);
  const [categoryType, setCategoryType] = useState<"parent" | "child" | "sub">("parent");
  const [parentId, setParentId] = useState("");
  const [altText, setAltText] = useState("");
  const [altTextManuallyEdited, setAltTextManuallyEdited] = useState(false);

  // Revoke object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Auto-fill altText from name
  useEffect(() => {
    if (name && !altTextManuallyEdited) {
      setAltText(name);
    }
  }, [name, altTextManuallyEdited]);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () =>
      api.get("/categories?limit=100").then((res) => res.data.data.data ?? []),
  });

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => {
      const id = formData.get("_editId");
      const config = { headers: { "Content-Type": "multipart/form-data" } };
      return id
        ? api.put(`/categories/${id}`, formData, config)
        : api.post("/categories", formData, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success(editingCategory ? "Category updated" : "Category created");
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Something went wrong");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category deleted (image removed from uploads)");
    },
  });

  const resetForm = () => {
    setName("");
    setSlug("");
    setDescription("");
    setImageFile(null);
    setImagePreview("");
    setImageRemoved(false);
    setEditingCategory(null);
    setCategoryType("parent");
    setParentId("");
    setAltText("");
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
    setImageRemoved(!!editingCategory?.image);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("slug", slug);
    formData.append("description", description);
    if (altText) formData.append("altText", altText);
    const level = categoryType === "parent" ? 0 : categoryType === "child" ? 1 : 2;
    formData.append("level", String(level));
    if (categoryType !== "parent" && parentId) {
      formData.append("parent", parentId);
    }
    if (imageFile) formData.append("image", imageFile);
    if (editingCategory) formData.append("_editId", editingCategory._id);
    if (imageRemoved && !imageFile && editingCategory?.image) {
      formData.append("removeImage", "true");
    }
    createMutation.mutate(formData);
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
            alt={row.name}
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          </div>
        ),
    },
    { header: "Name", accessorKey: "name", cell: (row: any) => (
      <Link href={`/admin/categories/${row._id}`} className="font-medium hover:underline">
        {row.name}
      </Link>
    ) },
    {
      header: "Type",
      accessorKey: "level",
      cell: (row: any) => {
        const level = row.level ?? 0;
        const typeConfig: Record<number, { label: string; color: string }> = {
          0: { label: "Parent", color: "bg-emerald-100 text-emerald-700" },
          1: { label: "Child", color: "bg-blue-100 text-blue-700" },
          2: { label: "Sub", color: "bg-purple-100 text-purple-700" },
        };
        const t = typeConfig[level] || typeConfig[0];
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${t.color}`}>
            {t.label}
          </span>
        );
      },
    },
    { header: "Slug", accessorKey: "slug" },
    { header: "Products", accessorKey: "productCount" },
    {
      header: "Actions",
      accessorKey: "_id",
      cell: (row: any) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/categories/${row._id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingCategory(row);
              setName(row.name);
              setSlug(row.slug);
              setDescription(row.description || "");
              setImageFile(null);
              setImagePreview(row.image ? getImageUrl(row.image) : "");
              const level = row.level ?? 0;
              setCategoryType(level === 0 ? "parent" : level === 1 ? "child" : "sub");
              setParentId(row.parent?._id || row.parent || "");
              setAltText(row.altText || row.name || "");
              setAltTextManuallyEdited(!!row.altText);
              setOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm(`Delete "${row.name}"? Its image will also be removed.`)) {
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
        <h1 className="text-3xl font-bold">Categories</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit" : "Create"} Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category Type</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={categoryType}
                  onChange={(e) => {
                    setCategoryType(e.target.value as "parent" | "child" | "sub");
                    setParentId("");
                  }}
                >
                  <option value="parent">Parent Category</option>
                  <option value="child">Child Category</option>
                  <option value="sub">Sub Category</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  {categoryType === "parent"
                    ? "Top-level category with no parent"
                    : categoryType === "child"
                    ? "Nested under a Parent Category"
                    : "Nested under a Child Category"}
                </p>
              </div>

              {categoryType === "child" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Parent Category</label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    required
                  >
                    <option value="">Select parent category</option>
                    {(categories || [])
                      .filter((c: any) => (c.level ?? 0) === 0)
                      .map((c: any) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {categoryType === "sub" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Parent Category (Child)</label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    required
                  >
                    <option value="">Select child category</option>
                    {(categories || [])
                      .filter((c: any) => (c.level ?? 0) === 1)
                      .map((c: any) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Slug</label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Image Alt Text</label>
                <Input
                  value={altText}
                  onChange={(e) => {
                    setAltText(e.target.value);
                    setAltTextManuallyEdited(true);
                  }}
                  placeholder="Auto-filled from category name"
                />
                <p className="text-xs text-muted-foreground">Used for SEO and accessibility. Auto-filled from category name.</p>
              </div>

              {/* Image upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Category Image</label>
                {imagePreview ? (
                  <div className="relative w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-32 w-32 rounded-lg object-cover border"
                    />
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
                      Click to upload image (JPEG, PNG, WEBP — max 5MB)
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

              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={categories || []} isLoading={isLoading} />
    </div>
  );
}
