"use client";

import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/common/empty-state";
import Breadcrumb from "@/components/common/breadcrumb";
import { Bell, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      api.get("/notifications").then((res) => res.data.data.data ?? []),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: () => {
      // Dots + "unread" count clear visibly — no popup needed.
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!notifications?.length) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={<Bell className="h-12 w-12" />}
          title="No notifications"
          description="You're all caught up! Notifications about orders, promotions, and more will appear here."
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container py-8"
    >
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "Notifications" }]}
      />

      <div className="flex items-center justify-between mt-8 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-muted-foreground">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((notification: any) => (
          <motion.div
            key={notification._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-start gap-4 p-4 rounded-xl border transition-colors",
              !notification.read && "bg-muted/50"
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full mt-2 shrink-0",
                !notification.read ? "bg-primary" : "bg-transparent"
              )}
            />
            <div className="flex-1">
              <h3 className="font-medium">{notification.title}</h3>
              <p className="text-sm text-muted-foreground">
                {notification.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(notification.createdAt), "MMM dd, yyyy h:mm a")}
              </p>
            </div>
            {!notification.read && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => markAsReadMutation.mutate(notification._id)}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
