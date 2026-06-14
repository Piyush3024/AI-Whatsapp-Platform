"use client";

import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/auth.store";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const accessToken = useAuthStore.getState().accessToken;

    socket = io(
      `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "http://localhost:3001"}/conversations`,
      {
        auth: { token: accessToken },
        transports: ["websocket", "polling"],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      },
    );
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
