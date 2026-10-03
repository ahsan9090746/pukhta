"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/auth-store";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5001";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    // Connection chatter stays out of the console (see SocketProvider note).

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, token]);

  const emit = (event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  };

  const on = (event: string, callback: (data: any) => void) => {
    socketRef.current?.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  };

  return { emit, on, socket: socketRef.current };
}
