"use client";

import {
  skipToken,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import { useIsAuthReady } from "@/hooks/use-auth-ready";
import {
  getAiPrompts,
  upsertAiPrompt,
  deleteAiPrompt,
} from "@/services/ai-prompt.service";

export function useAiPrompts() {
  const isReady = useIsAuthReady();

  return useQuery({
    queryKey: QUERY_KEYS.tenant.aiPrompts.list,
    queryFn: isReady ? getAiPrompts : skipToken,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpsertAiPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertAiPrompt,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.tenant.aiPrompts.all,
      });
      toast.success("AI prompt saved successfully.");
    },
    onError: () => {
      toast.error("Failed to save AI prompt. Please try again.");
    },
  });
}

export function useDeleteAiPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAiPrompt,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.tenant.aiPrompts.all,
      });
      toast.success("AI prompt deleted.");
    },
    onError: () => {
      toast.error("Failed to delete prompt.");
    },
  });
}
