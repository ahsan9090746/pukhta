"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DataTable from "@/components/admin/data-table";
import { toast } from "sonner";
import { Plus, Trash2, Edit, ImagePlus, X, Search, Loader2 } from "lucide-react";
import { getImageUrl } from "@/lib/utils";

type LinkType = "url" | "product" | "categories";

interface BannerRow {
  _id: string;
  title: string;
  altText?: string;
  image: string;
  mobileImage?: string;
  link: string;
  linkType: LinkType;
  sortOrder: number;
  isActive: boolean;
}

interface ProductOption {
  _id: string;
  name: string;
  slug: string;
  sku?: string;
}

interface CategoryNode {
  _id: string;
  name: string;
  slug: string;
  level?: number;
  children?: CategoryNode[];
}

type FlatCategory = CategoryNode & { level: number };

const emptyForm = {
  title: "",
  altText: "",
  link: "",
  linkType: "url" as LinkType,
  sortOrder: 1,
  isActive: true,
};

/** Flattens /categories/tree into a searchable list that keeps the nesting level. */
const flattenCategories = (nodes: CategoryNode[], level = 0): FlatCategory[] =>
  nodes.flatMap((node) => [
    { ...node, level },
    ...flattenCategories(node.children || [], level + 1),
  ]);

/** First free hero position (1, 2, 3, …) — mirrors the server-side rule. */
const nextFreeSortOrder = (banners: BannerRow[]) => {
  const taken = new Set((banners || []).map((b) => Number(b.sortOrder)));
  let next = 1;
  while (taken.has(next)) next += 1;
  return next;
};

const categoryLabel = (category: FlatCategory) =>
  `${category.name} ${
    category.level === 0 ? "(Parent)" : category.level === 1 ? "(Child)" : "(Sub)"
  }`;

const linkTypeLabel = (linkType?: LinkType) =>
  linkType === "product" ? "Product" : linkType === "categories" ? "Category" : "Custom URL";

/** Reusable artwork picker used for the desktop + mobile uploads. */
interface ImagePickerProps {
  label: string;
  hint: string;
  previewClass: string;
  preview: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

function ImagePicker({
  label,
  hint,
  previewClass,
  preview,
  inputRef,
  onChange,
  onClear,
}: ImagePickerProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {preview ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={`${label} preview`}
            className={`${previewClass} rounded-lg border object-cover`}
          />
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${label}`}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors"
        >
          <ImagePlus className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{hint}</p>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onChange}
        className="hidden"
      />
    </div>
  );
}

export default function AdminBannersPage() {
  const queryClient = useQueryClient();
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerRow | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  // Desktop + mobile artwork are uploaded separately
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState("");
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [mobilePreview, setMobilePreview] = useState("");
  const [mobileRemoved, setMobileRemoved] = useState(false);

  const [altTextManuallyEdited, setAltTextManuallyEdited] = useState(false);

  // Single-select link picker
  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [showProducts, setShowProducts] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FlatCategory | null>(null);
  const [showCategories, setShowCategories] = useState(false);

  // Preview object URLs must be revoked to avoid memory leaks
  useEffect(() => {
    return () => {
      if (desktopPreview.startsWith("blob:")) URL.revokeObjectURL(desktopPreview);
    };
  }, [desktopPreview]);

  useEffect(() => {
    return () => {
      if (mobilePreview.startsWith("blob:")) URL.revokeObjectURL(mobilePreview);
    };
  }, [mobilePreview]);

  // Click outside to close the link pickers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productRef.current && !productRef.current.contains(e.target as Node)) setShowProducts(false);
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setShowCategories(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-fill altText from the title until it is edited by hand
  useEffect(() => {
    if (form.title && !altTextManuallyEdited) {
      setForm((prev) => ({ ...prev, altText: form.title }));
    }
  }, [form.title, altTextManuallyEdited]);

  // Debounced product search (name / tags / SKU) for the product picker
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedProductSearch(productSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const { data: banners, isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: () =>
      api
        .get("/admin/banners?limit=100&sort=sortOrder")
        .then((res) => res.data.data.data ?? []),
  });

  // Product options for the link picker — searched server-side so SKU lookups
  // keep working even when the catalog is larger than a single page.
  const { data: productOptions, isFetching: productsLoading } = useQuery({
    queryKey: ["banner-products", debouncedProductSearch],
    queryFn: () =>
      api
        .get(`/products?search=${encodeURIComponent(debouncedProductSearch)}&limit=20`)
        .then((res) => res.data.data.data ?? []),
    enabled: open && form.linkType === "product",
  });

  // Category options for the link picker (full tree, flattened client-side)
  const { data: categoryTree } = useQuery({
    queryKey: ["banner-categories"],
    queryFn: () =>
      api.get("/categories/tree").then((res) => res.data.data.categories ?? []),
    enabled: open && form.linkType === "categories",
  });

  const categories: FlatCategory[] = useMemo(
    () => flattenCategories(categoryTree || []),
    [categoryTree]
  );

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) => category.name.toLowerCase().includes(query));
  }, [categories, categorySearch]);

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
      // refresh the storefront hero as well
      queryClient.invalidateQueries({ queryKey: ["banners"] });
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
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Banner deleted (images removed from uploads)");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Could not delete the banner");
    },
  });

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingBanner(null);
    setDesktopFile(null);
    setDesktopPreview("");
    setMobileFile(null);
    setMobilePreview("");
    setMobileRemoved(false);
    setAltTextManuallyEdited(false);
    setProductSearch("");
    setDebouncedProductSearch("");
    setSelectedProduct(null);
    setShowProducts(false);
    setCategorySearch("");
    setSelectedCategory(null);
    setShowCategories(false);
    if (desktopInputRef.current) desktopInputRef.current.value = "";
    if (mobileInputRef.current) mobileInputRef.current.value = "";
  };

  // A new banner always starts on the next free hero position (1, 2, 3, …)
  const openCreate = () => {
    resetForm();
    setForm({ ...emptyForm, sortOrder: nextFreeSortOrder(banners || []) });
  };

  const pickImage = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "desktop" | "mobile"
  ) => {
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
    if (target === "desktop") {
      setDesktopFile(file);
      setDesktopPreview(URL.createObjectURL(file));
    } else {
      setMobileFile(file);
      setMobilePreview(URL.createObjectURL(file));
      setMobileRemoved(false);
    }
  };

  // The desktop artwork is required, so clearing only drops the pending pick —
  // an existing banner keeps its stored image.
  const clearDesktopImage = () => {
    setDesktopFile(null);
    setDesktopPreview(editingBanner?.image ? getImageUrl(editingBanner.image) : "");
    if (desktopInputRef.current) desktopInputRef.current.value = "";
  };

  // The mobile artwork is optional — clearing it removes the stored file.
  const clearMobileImage = () => {
    setMobileFile(null);
    setMobilePreview("");
    setMobileRemoved(!!editingBanner?.mobileImage);
    if (mobileInputRef.current) mobileInputRef.current.value = "";
  };

  const openEdit = (banner: BannerRow) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title || "",
      altText: banner.altText || banner.title || "",
      link: banner.link || "",
      linkType: banner.linkType || "url",
      sortOrder: banner.sortOrder ?? 1,
      isActive: banner.isActive ?? true,
    });
    setAltTextManuallyEdited(!!banner.altText && banner.altText !== banner.title);
    setDesktopFile(null);
    setDesktopPreview(banner.image ? getImageUrl(banner.image) : "");
    setMobileFile(null);
    setMobilePreview(banner.mobileImage ? getImageUrl(banner.mobileImage) : "");
    setMobileRemoved(false);
    setProductSearch("");
    setSelectedProduct(null);
    setShowProducts(false);
    setCategorySearch("");
    setSelectedCategory(null);
    setShowCategories(false);
    setOpen(true);

    // Resolve the saved target so the picker shows what the banner links to
    const slug = (banner.link || "")
      .replace(/^\/+(product-category|product|categories)\//, "")
      .replace(/^\/+/, "")
      .split(/[?#]/)[0];
    if (!slug) return;

    if (banner.linkType === "product") {
      api
        .get(`/products/slug/${encodeURIComponent(slug)}`)
        .then((res) => setSelectedProduct(res.data.data.product))
        .catch(() => setSelectedProduct(null));
    } else if (banner.linkType === "categories") {
      api
        .get(`/categories/${encodeURIComponent(slug)}`)
        .then((res) => setSelectedCategory(res.data.data.category))
        .catch(() => setSelectedCategory(null));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!editingBanner && !desktopFile) {
      toast.error("Desktop banner image is required");
      return;
    }
    if (form.linkType === "product" && !selectedProduct) {
      toast.error("Please select the product this banner should link to");
      return;
    }
    if (form.linkType === "categories" && !selectedCategory) {
      toast.error("Please select the category this banner should link to");
      return;
    }
    if (form.linkType === "url" && !form.link.trim()) {
      toast.error("Please enter the URL this banner should link to");
      return;
    }
    // Every hero position belongs to exactly one banner
    const clash = (banners || []).find(
      (banner: BannerRow) =>
        Number(banner.sortOrder) === Number(form.sortOrder) && banner._id !== editingBanner?._id
    );
    if (clash) {
      toast.error(`Sort order ${form.sortOrder} is already used by "${clash.title}"`);
      return;
    }

    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("altText", (form.altText || form.title).trim());
    fd.append("link", form.link.trim());
    fd.append("linkType", form.linkType);
    fd.append("position", "hero");
    fd.append("sortOrder", String(form.sortOrder));
    fd.append("isActive", String(form.isActive));
    if (desktopFile) fd.append("image", desktopFile);
    if (mobileFile) fd.append("mobileImage", mobileFile);
    if (!mobileFile && mobileRemoved) fd.append("removeMobileImage", "true");
    if (editingBanner) fd.append("_editId", editingBanner._id);
    saveMutation.mutate(fd);
  };

  const columns = [
    {
      header: "Desktop",
      accessorKey: "image",
      cell: (row: BannerRow) =>
        row.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getImageUrl(row.image)}
            alt={row.altText || row.title}
            className="h-10 w-20 rounded object-cover border"
          />
        ) : (
          <div className="h-10 w-20 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        ),
    },
    {
      header: "Mobile",
      accessorKey: "mobileImage",
      cell: (row: BannerRow) =>
        row.mobileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getImageUrl(row.mobileImage)}
            alt={`${row.altText || row.title} (mobile)`}
            className="h-10 w-6 rounded object-cover border"
          />
        ) : (
          <span className="text-xs text-muted-foreground">Uses desktop</span>
        ),
    },
    { header: "Order", accessorKey: "sortOrder" },
    { header: "Title", accessorKey: "title" },
    {
      header: "Link",
      accessorKey: "link",
      cell: (row: BannerRow) => (
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {linkTypeLabel(row.linkType)}
          </span>
          <span className="text-sm">{row.link || "-"}</span>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "isActive",
      cell: (row: BannerRow) =>
        row.isActive ? (
          <span className="text-green-600 text-sm font-medium">Active</span>
        ) : (
          <span className="text-muted-foreground text-sm">Hidden</span>
        ),
    },
    {
      header: "Actions",
      accessorKey: "_id",
      cell: (row: BannerRow) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit">
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm("Delete this banner? Its images will also be removed.")) {
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Hero Banners</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Image-only slides for the homepage hero — nothing is printed over the artwork. Desktop
            and mobile images are uploaded separately and the whole image links to the chosen URL,
            product or category.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingBanner ? "Edit" : "Create"} Hero Banner</DialogTitle>
              <DialogDescription>
                Title and alt text are used by the admin list, SEO and screen readers only — the
                storefront shows the image with no text on it.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <ImagePicker
                  label="Desktop Image (required)"
                  hint="Click to upload wide artwork (JPEG, PNG, WEBP — max 5MB)"
                  previewClass="h-28 w-48"
                  preview={desktopPreview}
                  inputRef={desktopInputRef}
                  onChange={(e) => pickImage(e, "desktop")}
                  onClear={clearDesktopImage}
                />
                <ImagePicker
                  label="Mobile Image (optional)"
                  hint="Click to upload portrait artwork — the desktop image is used when empty"
                  previewClass="h-28 w-16"
                  preview={mobilePreview}
                  inputRef={mobileInputRef}
                  onChange={(e) => pickImage(e, "mobile")}
                  onClear={clearMobileImage}
                />
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Internal name, e.g. Summer Sale Hero"
                  required
                />
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
                <p className="text-xs text-muted-foreground">
                  Used for SEO and accessibility. Auto-filled from the title.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Link Type</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={form.linkType}
                  onChange={(e) => {
                    setForm({ ...form, linkType: e.target.value as LinkType, link: "" });
                    setProductSearch("");
                    setSelectedProduct(null);
                    setCategorySearch("");
                    setSelectedCategory(null);
                  }}
                >
                  <option value="url">Custom URL</option>
                  <option value="product">Product</option>
                  <option value="categories">Categories</option>
                </select>
              </div>

              {/* Second field appears below, matching the chosen link type */}
              {form.linkType === "url" && (
                <div className="space-y-2">
                  <Label>Custom URL</Label>
                  <Input
                    placeholder="/product-category or https://..."
                    value={form.link}
                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Where a click on the banner image should go.
                  </p>
                </div>
              )}

              {form.linkType === "product" && (
                <div className="space-y-2" ref={productRef}>
                  <Label>Select Product (one only)</Label>
                  {selectedProduct ? (
                    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{selectedProduct.name}</p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {selectedProduct.sku || "-"} · /product/{selectedProduct.slug}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Clear selected product"
                        onClick={() => {
                          setSelectedProduct(null);
                          setForm((prev) => ({ ...prev, link: "" }));
                          setProductSearch("");
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        placeholder="Search by product name or SKU..."
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowProducts(true);
                        }}
                        onFocus={() => setShowProducts(true)}
                      />
                      <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      {showProducts && (
                        <div className="absolute z-50 top-full mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover shadow-md">
                          {productsLoading && (
                            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...
                            </div>
                          )}
                          {!productsLoading && (productOptions || []).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              No product found
                            </div>
                          )}
                          {(productOptions || []).map((product: ProductOption) => (
                            <button
                              key={product._id}
                              type="button"
                              onClick={() => {
                                setSelectedProduct(product);
                                setForm((prev) => ({ ...prev, link: `/product/${product.slug}` }));
                                setProductSearch("");
                                setShowProducts(false);
                              }}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                            >
                              <span className="truncate">{product.name}</span>
                              {product.sku && (
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  SKU: {product.sku}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Search by product name or SKU. Only one product can be linked.
                  </p>
                </div>
              )}

              {form.linkType === "categories" && (
                <div className="space-y-2" ref={categoryRef}>
                  <Label>Select Category (one only)</Label>
                  {selectedCategory ? (
                    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {categoryLabel(selectedCategory)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          /product-category/{selectedCategory.slug}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Clear selected category"
                        onClick={() => {
                          setSelectedCategory(null);
                          setForm((prev) => ({ ...prev, link: "" }));
                          setCategorySearch("");
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        placeholder="Search category..."
                        value={categorySearch}
                        onChange={(e) => {
                          setCategorySearch(e.target.value);
                          setShowCategories(true);
                        }}
                        onFocus={() => setShowCategories(true)}
                      />
                      <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      {showCategories && (
                        <div className="absolute z-50 top-full mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover shadow-md">
                          {filteredCategories.length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              No category found
                            </div>
                          )}
                          {filteredCategories.map((category) => (
                            <button
                              key={category._id}
                              type="button"
                              onClick={() => {
                                setSelectedCategory(category);
                                setForm((prev) => ({
                                  ...prev,
                                  link: `/product-category/${category.slug}`,
                                }));
                                setCategorySearch("");
                                setShowCategories(false);
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                            >
                              {category.level > 0 && "\u2514 "}
                              {categoryLabel(category)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Only one category can be linked — parents, children and sub-categories are all
                    searchable.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Position</Label>
                  <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm">
                    Hero
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm({ ...form, sortOrder: parseInt(e.target.value) || 1 })
                    }
                  />
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
              <p className="text-xs text-muted-foreground">
                Every banner sits in the homepage hero slider and is ordered by Sort Order. New
                banners start on the next free number (1, 2, 3 …) and no two banners can share the
                same one.
              </p>

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
