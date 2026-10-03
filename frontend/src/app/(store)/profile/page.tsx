"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import Breadcrumb from "@/components/common/breadcrumb";
import { CheckCircle2, Loader2, User, Lock, MapPin, Plus, Trash2 } from "lucide-react";

type ActionStatus = { ok: boolean; message: string } | null;

/** Inline success/error line under a form (no popup). */
function StatusLine({ status }: { status: ActionStatus }) {
  if (!status) return null;
  if (status.ok) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-sm font-medium text-emerald-700"
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        {status.message}
      </p>
    );
  }
  return (
    <p role="alert" className="text-sm font-medium text-destructive">
      {status.message}
    </p>
  );
}

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  // Inline per-section feedback (Amazon account-page style, no popup).
  const [profileStatus, setProfileStatus] = useState<ActionStatus>(null);
  const [passwordStatus, setPasswordStatus] = useState<ActionStatus>(null);
  const [addressStatus, setAddressStatus] = useState<ActionStatus>(null);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const { data: addresses, isLoading: addressesLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: () =>
      api.get("/addresses").then((res) => res.data.data.addresses ?? []),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => api.put("/auth/profile", data),
    onSuccess: (response) => {
      setUser(response.data.data.user);
      setIsEditing(false);
      setProfileStatus({ ok: true, message: "Profile updated." });
    },
    onError: (error: any) => {
      setProfileStatus({
        ok: false,
        message: error.response?.data?.message || "Failed to update profile.",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.put("/auth/change-password", data),
    onSuccess: () => {
      resetPassword();
      setPasswordStatus({ ok: true, message: "Password changed successfully." });
    },
    onError: (error: any) => {
      setPasswordStatus({
        ok: false,
        message:
          error.response?.data?.message || "Failed to change password.",
      });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/addresses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      setAddressStatus({ ok: true, message: "Address deleted." });
    },
    onError: () => {
      setAddressStatus({ ok: false, message: "Could not delete address." });
    },
  });

  const onUpdateProfile = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onChangePassword = (data: PasswordFormData) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container py-8"
    >
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "My Profile" }]}
      />

      <h1 className="text-3xl font-bold mt-8 mb-6">My Profile</h1>

      <Tabs defaultValue="profile" className="max-w-3xl">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="password" className="gap-2">
            <Lock className="h-4 w-4" />
            Password
          </TabsTrigger>
          <TabsTrigger value="addresses" className="gap-2">
            <MapPin className="h-4 w-4" />
            Addresses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmitProfile(onUpdateProfile)}
                className="space-y-4"
              >
                <StatusLine status={profileStatus} />
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...registerProfile("name")} disabled={!isEditing} />
                  {profileErrors.name && (
                    <p className="text-sm text-destructive">
                      {profileErrors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...registerProfile("email")} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...registerProfile("phone")} disabled={!isEditing} />
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button type="submit" disabled={updateProfileMutation.isPending}>
                        {updateProfileMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Changes
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button type="button" onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmitPassword(onChangePassword)}
                className="space-y-4 max-w-md"
              >
                <StatusLine status={passwordStatus} />
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    {...registerPassword("currentPassword")}
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-sm text-destructive">
                      {passwordErrors.currentPassword.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...registerPassword("newPassword")}
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-sm text-destructive">
                      {passwordErrors.newPassword.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...registerPassword("confirmPassword")}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {passwordErrors.confirmPassword.message}
                    </p>
                  )}
                </div>
                <Button type="submit" disabled={changePasswordMutation.isPending}>
                  {changePasswordMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Change Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Saved Addresses</CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Address
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <StatusLine status={addressStatus} />
              </div>
              {addressesLoading ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              ) : !addresses?.length ? (
                <p className="text-muted-foreground text-center py-8">
                  No saved addresses
                </p>
              ) : (
                <div className="space-y-4">
                  {addresses.map((addr: any) => (
                    <div
                      key={addr._id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{addr.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          {addr.address1}, {addr.city}, {addr.state} {addr.postalCode}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAddressMutation.mutate(addr._id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
