"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Breadcrumb from "@/components/common/breadcrumb";
import { toast } from "sonner";
import { Plus, Trash2, Upload, X } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z.string().min(2, "Slug is required"),
  description: z.string().min(10, "Description is required"),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  compareAtPrice: z.coerce.number().optional(),
  sku: z.string().min(1, "SKU is required"),
  costPrice: z.coerce.number().min(0).optional(),
  shortDescription: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function CreateProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [variants, setVariants] = useState<{ size: string; stock: number; sku: string }[]>([]);
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([]);
  const [altText, setAltText] = useState("");
  const [altTextManuallyEdited, setAltTextManuallyEdited] = useState(false);
  const [sizeDialogOpen, setSizeDialogOpen] = useState(false);
  const [newSizeLabel, setNewLabel] = useState("");
  const [newSizePk, setNewSizePk] = useState("");
  const [newSizeEu, setNewSizeEu] = useState("");
  const [newSizeUs, setNewSizeUs] = useState("");
  const [creatingForVariantIndex, setCreatingForVariantIndex] = useState<number | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { price: 0 },
  });

  const watchName = watch("name");

  useEffect(() => {
    if (watchName && !altTextManuallyEdited) {
      setAltText(watchName);
    }
  }, [watchName, altTextManuallyEdited]);

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


  // Auto-generate the next sequential SKU (e.g. 44 products -> SKU-45)
  const { data: productCount } = useQuery({
    queryKey: ["products-count"],
    queryFn: () =>
      api.get("/products?limit=1").then((res) => res.data.data.pagination.total as number),
  });

  useEffect(() => {
    if (typeof productCount === "number") {
      setValue("sku", `SKU-${productCount + 1}`);
    }
  }, [productCount, setValue]);

  const createProductMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.post("/products", formData, { headers: { "Content-Type": "multipart/form-data" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created successfully");
      router.push("/admin/products");
    },
    onError: (error: any) => {
      const detail = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to create product";
      toast.error("Error", { description: error.response ? `[${error.response.status}] ${detail}` : detail });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    createProductMutation.mutate((() => {
      const fd = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== "" && value !== null) fd.append(key, String(value));
      });
      // Product price is the same for every variant — apply it to each variant
      fd.append("variants", JSON.stringify(variants.map((v) => ({ ...v, price: data.price }))));
      fd.append("specifications", JSON.stringify(specs));
      if (altText) fd.append("altText", altText);
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

  const removeNewImage = (i: number) => {
    setNewImages((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addVariant = () => setVariants([...variants, { size: "", stock: 0, sku: "" }]);
  const removeVariant = (i: number) => setVariants(variants.filter((_, idx) => idx !== i));
  const updateVariant = (i: number, field: string, value: string | number) => {
    const n = [...variants]; (n[i] as any)[field] = value; setVariants(n);
  };

  const addAllSizes = () => {
    if (!sizes || !sizes.length) return;
    const existingSizes = variants.map((v) => v.size).filter(Boolean);
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

  const addSpec = () => setSpecs([...specs, { key: "", value: "" }]);
  const removeSpec = (i: number) => setSpecs(specs.filter((_, idx) => idx !== i));
  const updateSpec = (i: number, field: string, value: string) => {
    const n = [...specs]; (n[i] as any)[field] = value; setSpecs(n);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Products", href: "/admin/products" }, { label: "Create Product" }]} />
      <h1 className="text-3xl font-bold">Create Product</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input id="name" {...register("name")} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" {...register("slug")} />
                  {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" rows={6} {...register("description")} />
                  {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shortDescription">Short Description</Label>
                  <Input id="shortDescription" {...register("shortDescription")} placeholder="One-line highlight shown under the product name" />
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
                  <Button type="button" variant="outline" size="sm" onClick={addVariant}><Plus className="h-4 w-4 mr-1" />Add Variant</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {variants.map((v, i) => {
                  const selectedSizes = variants.filter((_, idx) => idx !== i).map((vv) => vv.size).filter(Boolean);
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
                              updateVariant(i, "size", e.target.value);
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
                      <div className="space-y-2"><Label>Stock</Label><Input type="number" min={0} value={v.stock} onChange={(e) => updateVariant(i, "stock", parseInt(e.target.value) || 0)} placeholder="Quantity in stock" /></div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Specifications</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addSpec}><Plus className="h-4 w-4 mr-1" />Add Spec</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {specs.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-4 items-end">
                    <div className="space-y-2"><Label>Key</Label><Input value={s.key} onChange={(e) => updateSpec(i, "key", e.target.value)} placeholder="Weight" /></div>
                    <div className="space-y-2"><Label>Value</Label><Input value={s.value} onChange={(e) => updateSpec(i, "value", e.target.value)} placeholder="10 oz" /></div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSpec(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Selling Price</Label><Input type="number" step="0.01" {...register("price")} />{errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}</div>
                <div className="space-y-2"><Label>Purchase Price <span className="text-muted-foreground font-normal"></span></Label><Input type="number" step="0.01" {...register("costPrice")} /></div>
                <div className="space-y-2"><Label>Compare at Price</Label><Input type="number" step="0.01" {...register("compareAtPrice")} /></div>
                <div className="space-y-2"><Label>SKU</Label><Input {...register("sku")} />{errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}</div>
                <p className="text-xs text-muted-foreground">Stock is managed per variant (Size) in the Variants section.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Organization</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Category</Label><select className="w-full border rounded-md p-2" {...register("categoryId")}><option value="">Select category</option>{categories?.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>{errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}</div>
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
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload images (JPEG, PNG, WEBP - max 5MB each)</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {previews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {previews.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
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
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={createProductMutation.isPending}>
              {createProductMutation.isPending ? "Creating..." : "Create Product"}
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
