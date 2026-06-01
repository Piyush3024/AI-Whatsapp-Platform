import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type {
  NotificationItem,
  PaginatedNotifications,
} from "@/types/notification.types";

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export const getNotifications = async (
  params?: NotificationQueryParams,
): Promise<PaginatedNotifications> => {
  const res = await apiClient.get<{ data: PaginatedNotifications }>(
    API_ENDPOINTS.notifications.list,
    { params },
  );
  return res.data.data;
};

export const getUnreadCount = async (): Promise<{ count: number }> => {
  const res = await apiClient.get<{ data: { count: number } }>(
    API_ENDPOINTS.notifications.unreadCount,
  );
  return res.data.data;
};

export const markNotificationRead = async (
  id: string,
): Promise<NotificationItem> => {
  const res = await apiClient.patch<{ data: NotificationItem }>(
    API_ENDPOINTS.notifications.markRead(id),
  );
  return res.data.data;
};

export const markAllNotificationsRead = async (): Promise<{
  count: number;
}> => {
  const res = await apiClient.patch<{ data: { count: number } }>(
    API_ENDPOINTS.notifications.markAllRead,
  );
  return res.data.data;
};
