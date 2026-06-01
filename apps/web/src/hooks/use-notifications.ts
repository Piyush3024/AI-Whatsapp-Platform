"use client";

import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { useIsAuthReady } from "@/hooks/use-auth-ready";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/services/notification.service";

export function useUnreadCount() {
  const isReady = useIsAuthReady();

  return useQuery({
    queryKey: QUERY_KEYS.notifications.unreadCount,
    queryFn: isReady ? getUnreadCount : skipToken,
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 30, // Poll every 30s for badge count
  });
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
