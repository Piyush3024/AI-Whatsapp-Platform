"use client";

import {
  useQuery,
  skipToken,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import { useIsAuthReady } from "@/hooks/use-auth-ready";
import {
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
  updateConversationStatus,
} from "@/services/conversation.service";
import type { ConversationQueryParams } from "@/services/conversation.service";
import type { ConversationStatus } from "@/types/conversation.types";

export function useConversations(params?: ConversationQueryParams) {
  const isReady = useIsAuthReady();

  return useQuery({
    queryKey: QUERY_KEYS.conversations.list(
      (params ?? {}) as Record<string, unknown>,
    ),
    queryFn: isReady ? () => getConversations(params) : skipToken,
    staleTime: 1000 * 5, // 5 seconds — matches polling interval
    refetchInterval: 1000 * 5, // Poll every 5 seconds
  });
}

export function useConversation(id: string) {
  const isReady = useIsAuthReady();

  return useQuery({
    queryKey: QUERY_KEYS.conversations.detail(id),
    queryFn: isReady ? () => getConversation(id) : skipToken,
    staleTime: 1000 * 5,
    refetchInterval: 1000 * 5,
  });
}

export function useMessages(conversationId: string) {
  const isReady = useIsAuthReady();

  return useQuery({
    queryKey: QUERY_KEYS.conversations.messages(conversationId),
    queryFn: isReady ? () => getMessages(conversationId) : skipToken,
    staleTime: 1000 * 5,
    refetchInterval: 1000 * 5,
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => sendMessage(conversationId, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.conversations.messages(conversationId),
      });
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.conversations.list(),
      });
    },
    onError: () => {
      toast.error("Failed to send message. Please try again.");
    },
  });
}

export function useUpdateConversationStatus(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: ConversationStatus) =>
      updateConversationStatus(conversationId, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        QUERY_KEYS.conversations.detail(conversationId),
        updated,
      );
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.conversations.list(),
      });
      toast.success("Conversation status updated.");
    },
    onError: () => {
      toast.error("Failed to update status. Please try again.");
    },
  });
}
