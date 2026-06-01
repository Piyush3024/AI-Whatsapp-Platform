export type NotificationType = "HUMAN_HANDOFF" | string;

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: {
    conversationId?: string;
    customerId?: string;
    customerPhone?: string;
    customerName?: string | null;
    [key: string]: unknown;
  };
  readAt: string | null;
  createdAt: string;
}

export interface PaginatedNotifications {
  items: NotificationItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  };
}
