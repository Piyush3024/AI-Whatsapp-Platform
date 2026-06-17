"use client";

import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth.store";

export function useSocket(): Socket | null {
  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      console.debug("[socket] connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.debug("[socket] disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.error("[socket] connection error:", err.message);
    });

    return () => {};
  }, [accessToken]);

  return socketRef.current;
}
