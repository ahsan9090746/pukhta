"use client";

import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/auth-store";

const SocketContext = createContext<Socket | null>(null);

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5001";

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    // No console output on connect/disconnect — keeps the browser
    // console clean (Lighthouse Best Practices penalizes console errors,
    // and quiet logs keep real problems visible).

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  return useContext(SocketContext);
}
