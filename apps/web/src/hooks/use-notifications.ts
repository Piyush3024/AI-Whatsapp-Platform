"use client";

import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { useIsAuthReady } from "@/hooks/use-auth-ready";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/services/notification.service";

export function useUnreadCount() {
  const isReady = useIsAuthReady();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.notifications.unreadCount,
    queryFn: isReady ? getUnreadCount : skipToken,
    staleTime: 1000 * 60, // 1 min — socket keeps it fresh
  });

  useEffect(() => {
    if (!isReady) return;

    const socket = getSocket();

    const handleNotificationUpdate = ({ count }: { count: number }) => {
      queryClient.setQueryData(QUERY_KEYS.notifications.unreadCount, { count });
    };

    socket.on("notification:unread", handleNotificationUpdate);

    return () => {
      socket.off("notification:unread", handleNotificationUpdate);
    };
  }, [isReady, queryClient]);

  return query;
}

export function useNotifications(params?: { unreadOnly?: boolean }) {
  const isReady = useIsAuthReady();

  return useQuery({
    queryKey: QUERY_KEYS.notifications.list(params),
    queryFn: isReady ? () => getNotifications(params) : skipToken,
    staleTime: 1000 * 15,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.notifications.all,
      });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.notifications.all,
      });
    },
  });
}
