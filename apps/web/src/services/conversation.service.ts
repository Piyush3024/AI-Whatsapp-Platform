import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type {
  Conversation,
  PaginatedConversations,
  CursorPaginatedMessages,
  MessageItem,
  ConversationStatus,
} from "@/types/conversation.types";

export interface ConversationQueryParams {
  status?: ConversationStatus;
  page?: number;
  limit?: number;
}

export const getConversations = async (
  params?: ConversationQueryParams,
): Promise<PaginatedConversations> => {
  const res = await apiClient.get<{ data: PaginatedConversations }>(
    API_ENDPOINTS.conversations.list,
    { params },
  );
  return res.data.data;
};

export const getConversation = async (id: string): Promise<Conversation> => {
  const res = await apiClient.get<{ data: Conversation }>(
    API_ENDPOINTS.conversations.detail(id),
  );
  return res.data.data;
};

export const getMessages = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
): Promise<CursorPaginatedMessages> => {
  const res = await apiClient.get<{ data: CursorPaginatedMessages }>(
    API_ENDPOINTS.conversations.messages(conversationId),
    { params: { cursor, limit } },
  );
  return res.data.data;
};

export const sendMessage = async (
  conversationId: string,
  content: string,
): Promise<MessageItem> => {
  const res = await apiClient.post<{ data: MessageItem }>(
    API_ENDPOINTS.conversations.messages(conversationId),
    { content },
  );
  return res.data.data;
};

export const updateConversationStatus = async (
  conversationId: string,
  status: ConversationStatus,
): Promise<Conversation> => {
  const res = await apiClient.patch<{ data: Conversation }>(
    API_ENDPOINTS.conversations.updateStatus(conversationId),
    { status },
  );
  return res.data.data;
};
