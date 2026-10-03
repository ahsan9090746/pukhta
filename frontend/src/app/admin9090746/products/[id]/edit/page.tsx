"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { MultiSelect } from "@/components/ui/multi-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Breadcrumb from "@/components/common/breadcrumb";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { getImageUrl } from "@/lib/utils";

const productSchema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z.string().min(2, "Slug is required"),
  description: z
    .string()
    .refine(
      (v) => v.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length >= 10,
      "Description is required"
    ),
  price: z.coerce.number().min(0.01),
  compareAtPrice: z.coerce.number().optional(),
  sku: z.string().min(1, "SKU is required"),
  costPrice: z.coerce.number().min(0).optional(),
  shortDescription: z.string().optional(),
  metaTitle: z.string().max(60, "Meta title cannot exceed 60 characters").optional(),
  metaDescription: z.string().max(160, "Meta description cannot exceed 160 characters").optional(),
  categoriesId: z.array(z.string()).min(1, "At least one category is required"),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function EditProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const [variants, setVariants] = useState<any[]>([]);
  const [specs, setSpecs] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [altText, setAltText] = useState("");
  const [altTextManuallyEdited, setAltTextManuallyEdited] = useState(false);
  const [sizeDialogOpen, setSizeDialogOpen] = useState(false);
  const [newSizeLabel, setNewLabel] = useState("");
  const [newSizePk, setNewSizePk] = useState("");
  const [newSizeEu, setNewSizeEu] = useState("");
  const [newSizeUs, setNewSizeUs] = useState("");
  const [creatingForVariantIndex, setCreatingForVariantIndex] = useState<number | null>(null);

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["product", params.id],
    queryFn: () =>
      api.get(`/products/${params.id}`).then((res) => res.data.data.product),
  });

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const watchName = watch("name");

  useEffect(() => {
    if (watchName && !altTextManuallyEdited) {
      setAltText(watchName);
    }
  }, [watchName, altTextManuallyEdited]);

  useEffect(() => {
    if (product) {
      const categoryIds = product.categories?.map((c: any) => c._id || c) || 
                         (product.category ? [product.category._id || product.category] : []);
      reset({
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        sku: product.sku,
        costPrice: product.costPrice || undefined,
        shortDescription: product.shortDescription || "",
        metaTitle: product.metaTitle || "",
        metaDescription: product.metaDescription || "",
        categoriesId: categoryIds,
      });
      setVariants(product.variants || []);
      setSpecs(product.specifications || []);
      setExistingImages((product.images || []).filter((p: string) => p && p.startsWith("/uploads/")));
      setAltText(product.altText || product.name || "");
      setAltTextManuallyEdited(!!product.altText);
    }
  }, [product, reset]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      api.get("/categories?limit=100").then((res) => res.data.data.data ?? []),
  });

  const { data: sizes, refetch: refetchSizes } = useQuery({
    queryKey: ["sizes"],
    queryFn: () =>
      api.get("/sizes").then((res) => res.data.data.sizes ?? []),
  });

  const createSizeMutation = useMutation({
    mutationFn: (data: { label: string; pk: string; eu: string; us: string }) =>
      api.post("/sizes", data),
    onSuccess: () => {
      refetchSizes();
      toast.success("Size created");
      setSizeDialogOpen(false);
      resetSizeForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create size");
    },
  });

const updateProductMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.put(`/products/${params.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated successfully");
      router.push("/admin9090746/products");
    },
    onError: (error: any) => {
      const detail = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to update product";
      toast.error("Error", { description: error.response ? `[${error.response.status}] ${detail}` : detail });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    updateProductMutation.mutate((() => {
      const fd = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        // Meta fields are appended explicitly below so clearing them (empty
        // string) still reaches the backend and resets the saved value.
        if (key === "metaTitle" || key === "metaDescription") return;
        if (value !== undefined && value !== "" && value !== null) {
          if (Array.isArray(value)) {
            fd.append(key, JSON.stringify(value));
          } else {
            fd.append(key, String(value));
          }
        }
      });
      // Product price is the same for every variant — apply it to each variant
      fd.append("variants", JSON.stringify(variants.map((v) => ({ ...v, price: data.price }))));
      fd.append("specifications", JSON.stringify(specs));
      fd.append("existingImages", JSON.stringify(existingImages));
      if (altText) fd.append("altText", altText);
      fd.append("metaTitle", data.metaTitle || "");
      fd.append("metaDescription", data.metaDescription || "");
      newImages.forEach((file) => fd.append("images", file));
      return fd;
    })());
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" is not an image`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" is over 5MB`);
        return;
      }
    }
    setNewImages((prev) => [...prev, ...files]);
    setPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeExistingImage = (i: number) => {
    setExistingImages((prev) => prev.filter((_, idx) => idx !== i));
  };

  const removeNewImage = (i: number) => {
    setNewImages((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addAllSizes = () => {
    if (!sizes || !sizes.length) return;
    const existingSizes = variants.map((v: any) => v.size).filter(Boolean);
    const newSizes = sizes
      .filter((s: any) => !existingSizes.includes(s.label))
      .map((s: any) => ({ size: s.label, stock: 0, sku: "" }));
    setVariants([...variants, ...newSizes]);
  };

  const resetSizeForm = () => {
    setNewLabel("");
    setNewSizePk("");
    setNewSizeEu("");
    setNewSizeUs("");
    setCreatingForVariantIndex(null);
  };

  const handleCreateSize = () => {
    if (!newSizeLabel || !newSizePk || !newSizeEu || !newSizeUs) {
      toast.error("All fields are required");
      return;
    }
    createSizeMutation.mutate({
      label: newSizeLabel,
      pk: newSizePk,
      eu: newSizeEu,
      us: newSizeUs,
    });
  };

  if (productLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Admin", href: "/admin9090746" }, { label: "Products", href: "/admin9090746/products" }, { label: "Edit Product" }]} />
      <h1 className="text-3xl font-bold">Edit Product</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Name</Label><Input {...register("name")} />{errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}</div>
                <div className="space-y-2"><Label>Slug</Label><Input {...register("slug")} />{errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}</div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Controller
                    control={control}
                    name="description"
                    render={({ field }) => (
                      <RichTextEditor value={field.value || ""} onChange={field.onChange} minHeight={180} />
                    )}
                  />
                  {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Short Description</Label>
                  <Controller
                    control={control}
                    name="shortDescription"
                    render={({ field }) => (
                      <RichTextEditor value={field.value || ""} onChange={field.onChange} minHeight={110} />
                    )}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Variants</CardTitle>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={addAllSizes}>
                    Select All Sizes
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setVariants([...variants, { size: "", stock: 0, sku: "" }])}><Plus className="h-4 w-4 mr-1" />Add</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {variants.map((v: any, i: number) => {
                  const selectedSizes = variants.filter((_: any, idx: number) => idx !== i).map((vv: any) => vv.size).filter(Boolean);
                  return (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-4 items-end">
                      <div className="space-y-2">
                        <Label>Size</Label>
                        <select
                          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                          value={v.size}
                          onChange={(e) => {
                            if (e.target.value === "__create_new__") {
                              setCreatingForVariantIndex(i);
                              setSizeDialogOpen(true);
                            } else {
                              const n = [...variants]; n[i].size = e.target.value; setVariants(n);
                            }
                          }}
                        >
                          <option value="">Select size</option>
                          {sizes?.map((s: any) => (
                            <option
                              key={s._id}
                              value={s.label}
                              disabled={selectedSizes.includes(s.label) && v.size !== s.label}
                            >
                              {s.label} {selectedSizes.includes(s.label) && v.size !== s.label ? "(used)" : ""}
                            </option>
                          ))}
                          <option value="__create_new__">+ Create New Size</option>
                        </select>
                      </div>
                      <div className="space-y-2"><Label>Stock</Label><Input type="number" min={0} value={v.stock} onChange={(e) => { const n = [...variants]; n[i].stock = parseInt(e.target.value) || 0; setVariants(n); }} placeholder="Quantity in stock" /></div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setVariants(variants.filter((_: any, idx: number) => idx !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Selling Price</Label><Input type="number" step="0.01" {...register("price")} /></div>
                <div className="space-y-2"><Label>Purchase Price <span className="text-muted-foreground font-normal"></span></Label><Input type="number" step="0.01" {...register("costPrice")} /></div>
                <div className="space-y-2"><Label>Compare at Price</Label><Input type="number" step="0.01" {...register("compareAtPrice")} /></div>
                <div className="space-y-2"><Label>SKU</Label><Input {...register("sku")} /></div>
                <p className="text-xs text-muted-foreground">Stock is managed per variant (Size) in the Variants section.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Organization</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Controller
                  control={control}
                  name="categoriesId"
                  rules={{ required: "At least one category is required" }}
                  render={({ field }) => (
                    <MultiSelect
                      options={categories?.map((c: any) => ({ value: c._id, label: c.name })) || []}
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder="Select categories"
                      label="Categories"
                    />
                  )}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Images</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Image Alt Text</Label>
                  <Input
                    value={altText}
                    onChange={(e) => {
                      setAltText(e.target.value);
                      setAltTextManuallyEdited(true);
                    }}
                    placeholder="Auto-filled from product name"
                  />
                  <p className="text-xs text-muted-foreground">Used for SEO and accessibility. Auto-filled from product name.</p>
                </div>
                {(existingImages.length > 0 || previews.length > 0) && (
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {existingImages.map((img, i) => (
                      <div key={img} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(i)}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {previews.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeNewImage(i)}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to add images (JPEG, PNG, WEBP — max 5MB each)</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>SEO</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Meta Title</Label>
                  <Input
                    placeholder="Enter meta title (max 60 characters)"
                    maxLength={60}
                    {...register("metaTitle")}
                  />
                  {errors.metaTitle && <p className="text-sm text-destructive">{errors.metaTitle.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <textarea
                    placeholder="Enter meta description (max 160 characters)"
                    maxLength={160}
                    rows={3}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...register("metaDescription")}
                  />
                  {errors.metaDescription && <p className="text-sm text-destructive">{errors.metaDescription.message}</p>}
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={updateProductMutation.isPending}>
              {updateProductMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>

      <Dialog open={sizeDialogOpen} onOpenChange={(v) => { setSizeDialogOpen(v); if (!v) resetSizeForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Size</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Size Label</Label>
              <Input
                value={newSizeLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="PK 13 / EU 46 / US 14"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>PK</Label>
                <Input value={newSizePk} onChange={(e) => setNewSizePk(e.target.value)} placeholder="13" />
              </div>
              <div className="space-y-2">
                <Label>EU</Label>
                <Input value={newSizeEu} onChange={(e) => setNewSizeEu(e.target.value)} placeholder="46" />
              </div>
              <div className="space-y-2">
                <Label>US</Label>
                <Input value={newSizeUs} onChange={(e) => setNewSizeUs(e.target.value)} placeholder="14" />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleCreateSize}
              disabled={createSizeMutation.isPending}
            >
              {createSizeMutation.isPending ? "Creating..." : "Create Size"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
