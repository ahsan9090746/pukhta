"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api.get("/settings").then((res) => res.data.data.settings),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.put("/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Settings saved");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      storeName: fd.get("storeName"),
      storeEmail: fd.get("storeEmail"),
      storePhone: fd.get("storePhone"),
      storeAddress: fd.get("storeAddress"),
      currency: fd.get("currency"),
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Store Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Store Name</Label>
                <Input name="storeName" defaultValue={settings?.storeName} />
              </div>
              <div className="space-y-2">
                <Label>Store Email</Label>
                <Input name="storeEmail" type="email" defaultValue={settings?.storeEmail} />
              </div>
              <div className="space-y-2">
                <Label>Store Phone</Label>
                <Input name="storePhone" defaultValue={settings?.storePhone} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input name="currency" defaultValue={settings?.currency || "PKR"} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Store Address</Label>
                <Input name="storeAddress" defaultValue={settings?.storeAddress} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Shipping is free on every order and no tax is applied — nothing else to configure.
            </p>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
