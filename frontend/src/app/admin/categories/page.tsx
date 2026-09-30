"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DataTable from "@/components/admin/data-table";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ImagePlus, X, Eye, Home } from "lucide-react";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [homeOpen, setHomeOpen] = useState(false);
  const [homeSelection, setHomeSelection] = useState<string[]>([]);

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
      queryClient.invalidateQueries({ queryKey: ["home-categories"] });
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
      queryClient.invalidateQueries({ queryKey: ["home-categories"] });
      queryClient.invalidateQueries({ queryKey: ["home-showcase"] });
      toast.success("Category deleted (image removed from uploads)");
    },
  });

  const homeSelectionMutation = useMutation({
    mutationFn: (categoryIds: string[]) =>
      api.patch("/categories/home-selection", { categoryIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["home-categories"] });
      queryClient.invalidateQueries({ queryKey: ["home-showcase"] });
      toast.success("Home page categories updated");
      setHomeOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Something went wrong");
    },
  });

  // Pre-fill current selection from the fetched categories when opening the dialog
  const openHomeSelection = () => {
    const current = (categories || [])
      .filter((c: any) => c.showOnHome)
      .map((c: any) => c._id);
    setHomeSelection(current);
    setHomeOpen(true);
  };

  const toggleHomeSelection = (id: string) => {
    setHomeSelection((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

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
    setMetaTitle("");
    setMetaDescription("");
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
    formData.append("metaTitle", metaTitle);
    formData.append("metaDescription", metaDescription);
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
    {
      header: "Products",
      accessorKey: "productCount",
      cell: (row: any) => (
        <Badge variant="secondary" className="font-medium">
          {row.productCount ?? 0} {row.productCount === 1 ? "product" : "products"}
        </Badge>
      ),
    },
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
              setMetaTitle(row.metaTitle || "");
              setMetaDescription(row.metaDescription || "");
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
        <div className="flex items-center gap-2">
          {/* Home Selection — choose which categories appear below "Shop by Category" */}
          <Dialog open={homeOpen} onOpenChange={setHomeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={openHomeSelection}>
                <Home className="h-4 w-4 mr-2" />
                Home Selection
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Select Home Page Categories</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground -mt-1">
                Selected categories will be listed below &quot;Shop by Category&quot; on the
                home page.
              </p>
              <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
                {(categories || []).map((c: any) => {
                  const checked = homeSelection.includes(c._id);
                  return (
                    <label
                      key={c._id}
                      className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                        checked ? "border-brand-gold/60 bg-brand-gold/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleHomeSelection(c._id)}
                      />
                      {c.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getImageUrl(c.image)}
                          alt={c.name}
                          className="h-9 w-9 rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                          <ImagePlus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-sm font-medium flex-1">{c.name}</span>
                      {c.showOnHome && (
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                          On Home
                        </Badge>
                      )}
                    </label>
                  );
                })}
              </div>
              <Button
                className="w-full"
                disabled={homeSelectionMutation.isPending}
                onClick={() => homeSelectionMutation.mutate(homeSelection)}
              >
                {homeSelectionMutation.isPending
                  ? "Saving..."
                  : `Save (${homeSelection.length} selected)`}
              </Button>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg">{editingCategory ? "Edit" : "Create"} Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Category Type</label>
                <select
                  className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
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
                    ? "Nested under a Parent Category (optional)"
                    : "Nested under a Child Category"}
                </p>
              </div>

              {categoryType === "child" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Parent Category (Optional)</label>
                  <select
                    className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
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
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Parent Category (Child)</label>
                  <select
                    className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
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

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-9" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Slug</label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} required className="h-9" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <RichTextEditor value={description} onChange={setDescription} minHeight={80} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Image Alt Text</label>
                <Input
                  value={altText}
                  onChange={(e) => {
                    setAltText(e.target.value);
                    setAltTextManuallyEdited(true);
                  }}
                  placeholder="Auto-filled from category name"
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">Used for SEO and accessibility. Auto-filled from category name.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Meta Title</label>
                <Input
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Enter meta title (max 60 characters)"
                  maxLength={60}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Meta Description</label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Enter meta description (max 160 characters)"
                  maxLength={160}
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {/* Image upload */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Category Image</label>
                {imagePreview ? (
                  <div className="relative w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-20 w-20 rounded-lg object-cover border"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed rounded-lg p-3 text-center hover:border-primary/50 transition-colors"
                  >
                    <ImagePlus className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
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

              <Button type="submit" className="w-full h-10" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>
      <DataTable columns={columns} data={categories || []} isLoading={isLoading} />
    </div>
  );
}
