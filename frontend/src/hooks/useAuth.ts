"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, setUser, setToken, logout } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post("/auth/login", data).then((res) => res.data.data),
    onSuccess: (data) => {
      setUser(data.user);
      setToken(data.token);
      document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}`;
      toast.success("Welcome back!");
      router.push("/");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Login failed");
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: any) =>
      api.post("/auth/register", data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Account created! Please check your email.");
      router.push("/login");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Registration failed");
    },
  });

  const logoutHandler = () => {
    logout();
    queryClient.clear();
    router.push("/");
  };

  return {
    user,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutHandler,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}
