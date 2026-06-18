"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";


export function useSocketEvent<T>(
  event: string,
  handler: (data: T) => void,
  enabled: boolean = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();
    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [event, handler, enabled]);
}