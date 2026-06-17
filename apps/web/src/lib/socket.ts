"use client";

import { io, type Socket } from "socket.io-client";

import { env } from "@/env";
import { useAuthStore } from "@/stores/auth.store";

const WS_BASE_URL = env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const accessToken = useAuthStore.getState().accessToken;

    socket = io(`${WS_BASE_URL}/conversations`, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function reconnectSocket(): void {
  disconnectSocket();
  getSocket();
}
