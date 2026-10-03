"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, Video, Film, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const MAX_SHORTS = 20;
const MIN_SHORTS = 5;

interface ShortItem {
  _id: string;
  video: string;
  category?: { _id: string; name: string; slug: string } | null;
  product?: { _id: string; name: string; slug: string } | null;
  sortOrder: number;
}

interface Option {
  _id: string;
  name: string;
  slug: string;
}

export default function AdminShortsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [productId, setProductId] = useState("");

  // Revoke object URL on cleanup
  useEffect(() => {
    return () => {
      if (videoPreview.startsWith("blob:")) URL.revokeObjectURL(videoPreview);
    };
  }, [videoPreview]);

  const { data: shorts, isLoading } = useQuery({
    queryKey: ["admin-shorts"],
    queryFn: () => api.get("/shorts").then((res) => res.data.data.shorts ?? []),
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () =>
      api.get("/products?limit=500").then((res) => res.data.data.data ?? []),
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-categories-shorts"],
    queryFn: () =>
      api.get("/categories?limit=500").then((res) => res.data.data.data ?? []),
  });

  const saveMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.post("/shorts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shorts"] });
      queryClient.invalidateQueries({ queryKey: ["shorts"] });
      toast.success("Short added successfully");
      resetForm();
      setOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Something went wrong");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/shorts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shorts"] });
      queryClient.invalidateQueries({ queryKey: ["shorts"] });
      toast.success("Short deleted (video removed from uploads)");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete short");
    },
  });

  const resetForm = () => {
    setVideoFile(null);
    setVideoPreview("");
    setCategoryId("");
    setProductId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file (MP4, WEBM, MOV)");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Video must be under 50MB");
      return;
    }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      toast.error("Please select a video file");
      return;
    }
    const formData = new FormData();
    formData.append("video", videoFile);
    if (categoryId) formData.append("categoryId", categoryId);
    if (productId) formData.append("productId", productId);
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Video className="h-8 w-8" />
            Shorts
          </h1>
          <p className="text-muted-foreground mt-1">
            Add up to {MAX_SHORTS} short videos for the homepage (minimum{" "}
            {MIN_SHORTS} to show the section). Each short can link to a
            product or category.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          disabled={(shorts?.length || 0) >= MAX_SHORTS}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Short ({shorts?.length || 0}/{MAX_SHORTS})
        </Button>
      </div>

      {/* Shorts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16] rounded-xl" />
          ))}
        </div>
      ) : !shorts || shorts.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl">
          <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No shorts yet</h3>
          <p className="text-muted-foreground mb-4">
            Add at least {MIN_SHORTS} short videos to activate the homepage
            Shorts section
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Short
          </Button>
        </div>
      ) : (
        <>
          {(shorts?.length || 0) < MIN_SHORTS && (
            <div className="bg-brand-gold/10 border border-brand-gold/30 text-sm rounded-lg p-3">
              ⚠️ The homepage Shorts section will only appear once at least{" "}
              {MIN_SHORTS} shorts are added ({shorts?.length || 0}/{MIN_SHORTS}{" "}
              added).
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {shorts.map((short: ShortItem) => (
              <div
                key={short._id}
                className="relative group aspect-[9/16] rounded-xl overflow-hidden bg-black border"
              >
                <video
                  src={short.video}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 w-full h-full object-cover"
                  onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                  onMouseLeave={(e) => e.currentTarget.pause()}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-8">
                  <p className="text-white text-xs font-medium truncate">
                    {short.product?.name || short.category?.name || "No link"}
                  </p>
                  <p className="text-white/60 text-[10px]">
                    {short.product
                      ? "Product"
                      : short.category
                      ? "Category"
                      : "Click-through disabled"}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    if (
                      confirm(
                        "Delete this short? The video file will also be removed."
                      )
                    ) {
                      deleteMutation.mutate(short._id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Short Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Short</DialogTitle>
            <DialogDescription>
              Upload a vertical video (MP4/WEBM/MOV, max 50MB) and optionally
              link it to a product or category.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Video upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleFileChange}
                className="hidden"
              />
              {videoPreview ? (
                <div className="relative aspect-[9/16] max-h-[280px] mx-auto rounded-xl overflow-hidden bg-black">
                  <video
                    src={videoPreview}
                    controls
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => {
                      setVideoFile(null);
                      setVideoPreview("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-brand-gold hover:text-brand-gold transition-colors"
                >
                  <Film className="h-8 w-8" />
                  <span className="text-sm font-medium">Click to upload video</span>
                  <span className="text-xs">MP4, WEBM or MOV — max 50MB</span>
                </button>
              )}
            </div>

            <ShortLinkSelectors
              categories={categories || []}
              products={products || []}
              categoryId={categoryId}
              productId={productId}
              onCategoryChange={(id: string) => setCategoryId(id)}
              onProductChange={(id: string) => setProductId(id)}
            />

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={saveMutation.isPending || !videoFile}
                className="flex-1 bg-brand-gold hover:bg-brand-gold-dark text-white"
              >
                {saveMutation.isPending ? "Uploading..." : "Add Short"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Category / Product selector dropdowns ---------- */
function ShortLinkSelectors({
  categories,
  products,
  categoryId,
  productId,
  onCategoryChange,
  onProductChange,
}: {
  categories: Option[];
  products: Option[];
  categoryId: string;
  productId: string;
  onCategoryChange: (id: string) => void;
  onProductChange: (id: string) => void;
}) {
  const [productSearch, setProductSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [showProducts, setShowProducts] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const productRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productRef.current && !productRef.current.contains(e.target as Node))
        setShowProducts(false);
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node))
        setShowCategories(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );
  const filteredCategories = categories.filter((c) =>
    c.name?.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Category dropdown */}
      <div className="relative" ref={categoryRef}>
        <label className="text-sm font-medium">
          Link to Category (optional)
        </label>
        <button
          type="button"
          onClick={() => {
            setShowCategories((s) => !s);
            setShowProducts(false);
          }}
          className="mt-1 w-full h-10 px-3 rounded-md border bg-background text-sm text-left flex items-center justify-between"
        >
          {categoryId
            ? categories.find((c) => c._id === categoryId)?.name
            : "Select a category..."}
          <Search className="h-4 w-4 opacity-50" />
        </button>
        {showCategories && (
          <div className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-popover shadow-lg">
            <div className="p-2 border-b sticky top-0 bg-popover">
              <input
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search categories..."
                className="w-full h-8 px-2 text-sm rounded border bg-background"
              />
            </div>
            <button
              type="button"
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-muted-foreground"
              onClick={() => {
                onCategoryChange("");
                setShowCategories(false);
              }}
            >
              None
            </button>
            {filteredCategories.map((c) => (
              <button
                key={c._id}
                type="button"
                className={`w-full px-3 py-2 text-sm text-left hover:bg-muted ${
                  categoryId === c._id ? "bg-brand-gold/10 font-medium" : ""
                }`}
                onClick={() => {
                  onCategoryChange(c._id);
                  setShowCategories(false);
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product dropdown */}
      <div className="relative" ref={productRef}>
        <label className="text-sm font-medium">
          Link to Product (optional)
        </label>
        <button
          type="button"
          onClick={() => {
            setShowProducts((s) => !s);
            setShowCategories(false);
          }}
          className="mt-1 w-full h-10 px-3 rounded-md border bg-background text-sm text-left flex items-center justify-between"
        >
          {productId
            ? products.find((p) => p._id === productId)?.name
            : "Select a product..."}
          <Search className="h-4 w-4 opacity-50" />
        </button>
        {showProducts && (
          <div className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-popover shadow-lg">
            <div className="p-2 border-b sticky top-0 bg-popover">
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full h-8 px-2 text-sm rounded border bg-background"
              />
            </div>
            <button
              type="button"
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-muted-foreground"
              onClick={() => {
                onProductChange("");
                setShowProducts(false);
              }}
            >
              None
            </button>
            {filteredProducts.map((p) => (
              <button
                key={p._id}
                type="button"
                className={`w-full px-3 py-2 text-sm text-left hover:bg-muted ${
                  productId === p._id ? "bg-brand-gold/10 font-medium" : ""
                }`}
                onClick={() => {
                  onProductChange(p._id);
                  setShowProducts(false);
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}