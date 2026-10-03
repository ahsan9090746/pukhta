"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, X, Save } from "lucide-react";
import { getImageUrl } from "@/lib/utils";
import { SOCIAL_FIELDS } from "@/lib/social-links";
import type { Settings } from "@/types";

/** All social platforms with empty values — shapes the form before settings load. */
const emptySocialMedia = (): Settings["socialMedia"] =>
  SOCIAL_FIELDS.reduce(
    (acc, { key }) => ({ ...acc, [key]: "" }),
    {} as Settings["socialMedia"]
  );

/** Logo slots the admin can upload separately (light/dark + shared fallback) */
type LogoField = "storeLogo" | "logoLight" | "logoDark";

type LogoFiles = Record<LogoField, File | null>;

/** Upload slots shown in Admin → Settings → General (array order = UI order) */
const LOGO_FIELDS: {
  field: LogoField;
  label: string;
  hint: string;
  removeFlag: string;
}[] = [
  {
    field: "storeLogo",
    label: "Shop Logo (fallback)",
    hint: "Used in both themes when a light/dark logo is not uploaded",
    removeFlag: "removeLogo",
  },
  {
    field: "logoLight",
    label: "Light Mode Logo",
    hint: "Shown on light backgrounds (light mode header)",
    removeFlag: "removeLogoLight",
  },
  {
    field: "logoDark",
    label: "Dark Mode Logo",
    hint: "Shown on dark backgrounds (dark mode header & footer)",
    removeFlag: "removeLogoDark",
  },
];

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [logoFiles, setLogoFiles] = useState<LogoFiles>({
    storeLogo: null,
    logoLight: null,
    logoDark: null,
  });
  const [logoPreviews, setLogoPreviews] = useState<Record<LogoField, string>>({
    storeLogo: "",
    logoLight: "",
    logoDark: "",
  });
  const [logoRemoved, setLogoRemoved] = useState<Record<LogoField, boolean>>({
    storeLogo: false,
    logoLight: false,
    logoDark: false,
  });

  const [form, setForm] = useState({
    storeName: "",
    storeDescription: "",
    storeEmail: "",
    storePhone: "",
    storeAddress: "",
    currency: "PKR",
    socialMedia: emptySocialMedia(),
    seo: { metaTitle: "", metaDescription: "", keywords: "" },
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api.get("/settings").then((res) => res.data.data.settings),
  });

  useEffect(() => {
    if (settings) {
      setForm({
        storeName: settings.storeName || "",
        storeDescription: settings.storeDescription || "",
        storeEmail: settings.storeEmail || "",
        storePhone: settings.storePhone || "",
        storeAddress: settings.storeAddress || "",
        currency: settings.currency || "PKR",
        socialMedia: SOCIAL_FIELDS.reduce(
          (acc, { key }) => ({ ...acc, [key]: settings.socialMedia?.[key] || "" }),
          {} as Settings["socialMedia"]
        ),
        seo: {
          metaTitle: settings.seo?.metaTitle || "",
          metaDescription: settings.seo?.metaDescription || "",
          keywords: settings.seo?.keywords?.join(", ") || "",
        },
      });
      setLogoPreviews({
        storeLogo: settings.storeLogo ? getImageUrl(settings.storeLogo) : "",
        logoLight: settings.logoLight ? getImageUrl(settings.logoLight) : "",
        logoDark: settings.logoDark ? getImageUrl(settings.logoDark) : "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (fd: FormData) => api.put("/settings", fd, { headers: { "Content-Type": "multipart/form-data" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Settings saved");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to save");
    },
  });

  const handleLogoChange = (
    field: LogoField,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    // Reset the input so the same file can be picked again after a removal
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    setLogoFiles((prev) => ({ ...prev, [field]: file }));
    setLogoRemoved((prev) => ({ ...prev, [field]: false }));
    setLogoPreviews((prev) => ({
      ...prev,
      [field]: URL.createObjectURL(file),
    }));
  };

  const removeLogo = (field: LogoField) => {
    setLogoFiles((prev) => ({ ...prev, [field]: null }));
    setLogoRemoved((prev) => ({ ...prev, [field]: true }));
    setLogoPreviews((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("storeName", form.storeName);
    fd.append("storeDescription", form.storeDescription);
    fd.append("storeEmail", form.storeEmail);
    fd.append("storePhone", form.storePhone);
    fd.append("storeAddress", form.storeAddress);
    fd.append("currency", form.currency);
    fd.append("socialMedia", JSON.stringify(form.socialMedia));
    fd.append("seo", JSON.stringify({
      metaTitle: form.seo.metaTitle,
      metaDescription: form.seo.metaDescription,
    }));
    fd.append("keywords", JSON.stringify(
      form.seo.keywords.split(",").map((k) => k.trim()).filter(Boolean)
    ));
    LOGO_FIELDS.forEach(({ field, removeFlag }) => {
      const file = logoFiles[field];
      if (file) fd.append(field, file);
      if (logoRemoved[field]) fd.append(removeFlag, "true");
    });
    saveMutation.mutate(fd);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Store Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Brand logos — one per theme (+ shared fallback) */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {LOGO_FIELDS.map(({ field, label, hint }) => (
                    <LogoUploader
                      key={field}
                      label={label}
                      hint={hint}
                      preview={logoPreviews[field]}
                      onChange={(e) => handleLogoChange(field, e)}
                      onRemove={() => removeLogo(field)}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Store Name</Label>
                    <Input
                      value={form.storeName}
                      onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Store Email</Label>
                    <Input
                      type="email"
                      value={form.storeEmail}
                      onChange={(e) => setForm({ ...form, storeEmail: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Store Phone</Label>
                    <Input
                      value={form.storePhone}
                      onChange={(e) => setForm({ ...form, storePhone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Store Address</Label>
                    <Input
                      value={form.storeAddress}
                      onChange={(e) => setForm({ ...form, storeAddress: e.target.value })}
                      placeholder="Namak Mandi Chowk, Peshawar"
                    />
                    <p className="text-xs text-muted-foreground">
                      This address pins the map shown on the Contact page.
                    </p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Store Description</Label>
                    <Input
                      value={form.storeDescription}
                      onChange={(e) => setForm({ ...form, storeDescription: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Media Tab */}
          <TabsContent value="social">
            <Card>
              <CardHeader>
                <CardTitle>Social Media Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  These links power the &quot;Follow&quot; icons on the product page and the footer.
                  Leave a field empty to hide that icon.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
                    <div key={key} className="space-y-2">
                      <Label>{label} URL</Label>
                      <Input
                        placeholder={placeholder}
                        value={form.socialMedia[key]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            socialMedia: { ...form.socialMedia, [key]: e.target.value },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO Tab */}
          <TabsContent value="seo">
            <Card>
              <CardHeader>
                <CardTitle>SEO Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Meta Title</Label>
                  <Input
                    placeholder="Your store name - Tagline"
                    value={form.seo.metaTitle}
                    onChange={(e) => setForm({ ...form, seo: { ...form.seo, metaTitle: e.target.value } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Input
                    placeholder="Brief description of your store for search engines"
                    value={form.seo.metaDescription}
                    onChange={(e) => setForm({ ...form, seo: { ...form.seo, metaDescription: e.target.value } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Keywords (comma separated)</Label>
                  <Input
                    placeholder="shoes, footwear, sneakers, boots"
                    value={form.seo.keywords}
                    onChange={(e) => setForm({ ...form, seo: { ...form.seo, keywords: e.target.value } })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-4">
          <Button type="submit" disabled={saveMutation.isPending} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Single logo upload box (preview + replace + remove) */
function LogoUploader({
  label,
  hint,
  preview,
  onChange,
  onRemove,
}: {
  label: string;
  hint: string;
  preview: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt={label}
              className="h-20 w-40 rounded-lg border bg-muted object-contain"
            />
            <button
              type="button"
              onClick={onRemove}
              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <label className="flex h-20 w-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:border-primary/50">
            <Upload className="mb-1 h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Upload Logo</span>
            <input
              type="file"
              accept="image/*"
              onChange={onChange}
              className="hidden"
            />
          </label>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
