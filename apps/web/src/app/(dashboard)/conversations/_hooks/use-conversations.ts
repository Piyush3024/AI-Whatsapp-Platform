"use client";

import { useEffect } from "react";
import {
  useQuery,
  skipToken,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import { useIsAuthReady } from "@/hooks/use-auth-ready";
import { getSocket } from "@/lib/socket";
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
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.conversations.list(
      (params ?? {}) as Record<string, unknown>,
    ),
    queryFn: isReady ? () => getConversations(params) : skipToken,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (!isReady) return;

    const socket = getSocket();

    const handleConversationUpdated = ({
      conversationId,
    }: {
      conversationId: string;
    }) => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.conversations.list(),
      });
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.conversations.detail(conversationId),
      });
    };

    socket.on("conversation:updated", handleConversationUpdated);

    return () => {
      socket.off("conversation:updated", handleConversationUpdated);
    };
  }, [isReady, queryClient]);

  return query;
}

export function useConversation(id: string) {
  const isReady = useIsAuthReady();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.conversations.detail(id),
    queryFn: isReady ? () => getConversation(id) : skipToken,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (!isReady) return;

    const socket = getSocket();

    socket.emit("join:conversation", { conversationId: id });

    const handleUpdated = ({ conversationId }: { conversationId: string }) => {
      if (conversationId === id) {
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.conversations.detail(id),
        });
      }
    };

    socket.on("conversation:updated", handleUpdated);

    return () => {
      socket.emit("leave:conversation", { conversationId: id });
      socket.off("conversation:updated", handleUpdated);
    };
  }, [id, isReady, queryClient]);

  return query;
}

export function useMessages(conversationId: string) {
  const isReady = useIsAuthReady();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.conversations.messages(conversationId),
    queryFn: isReady ? () => getMessages(conversationId) : skipToken,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (!isReady) return;

    const socket = getSocket();

    const handleNewMessage = ({
      conversationId: incomingId,
    }: {
      conversationId: string;
    }) => {
      if (incomingId === conversationId) {
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.conversations.messages(conversationId),
        });
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("conversation:updated", handleNewMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("conversation:updated", handleNewMessage);
    };
  }, [conversationId, isReady, queryClient]);

  return query;
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
