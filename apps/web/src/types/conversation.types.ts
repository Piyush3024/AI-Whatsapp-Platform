export type ConversationStatus = "OPEN" | "HUMAN_HANDOFF" | "CLOSED";
export type ConversationState =
  | "IDLE"
  | "GREETING"
  | "COLLECTING_SERVICE"
  | "COLLECTING_DATE"
  | "COLLECTING_TIME"
  | "CONFIRMING_BOOKING"
  | "BOOKING_CONFIRMED"
  | "HUMAN_HANDOFF";

export type MessageDirection = "INBOUND" | "OUTBOUND";
export type MessageType =
  | "TEXT"
  | "TEMPLATE"
  | "INTERACTIVE"
  | "MEDIA"
  | "SYSTEM";
export type MessageStatus = "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED";

export interface ConversationCustomer {
  id: string;
  name: string | null;
  phone: string;
}

export interface ConversationStaff {
  id: string;
  name: string;
}

export interface ConversationLastMessage {
  content: string | null;
  direction: MessageDirection;
  createdAt: string;
}

export interface Conversation {
  id: string;
  status: ConversationStatus;
  state: ConversationState;
  customer: ConversationCustomer;
  lastMessage: ConversationLastMessage | null;
  assignedStaff: ConversationStaff | null;
  unreadCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface MessageItem {
  id: string;
  content: string | null;
  direction: MessageDirection;
  messageType: MessageType;
  status: MessageStatus;
  createdAt: string;
}

export interface PaginatedConversations {
  items: Conversation[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CursorPaginatedMessages {
  items: MessageItem[];
  nextCursor: string | null;
  hasMore: boolean;
}
