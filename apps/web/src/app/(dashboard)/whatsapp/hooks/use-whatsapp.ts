import {
  useQuery,
  useMutation,
  useQueryClient,
  skipToken,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  getWhatsAppNumbers,
  createWhatsAppNumber,
  updateWhatsAppNumber,
  deleteWhatsAppNumber,
  sendTestMessage,
} from "@/services/whatsapp.service";
import { handleApiError } from "@/lib/handle-error";
import { useIsAuthReady } from "@/hooks/use-auth-ready";
import type {
  WhatsAppQuery,
  CreateWhatsAppNumberDto,
  UpdateWhatsAppNumberDto,
  SendTestMessageDto,
} from "@/types/whatsapp.types";

export function useWhatsAppNumbers(params?: WhatsAppQuery) {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.whatsapp.list(params),
    queryFn: isReady ? () => getWhatsAppNumbers(params) : skipToken,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateWhatsAppNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateWhatsAppNumberDto) => createWhatsAppNumber(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.whatsapp.all });
      toast.success("WhatsApp number added successfully");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to add number" }),
  });
}

export function useUpdateWhatsAppNumber(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateWhatsAppNumberDto) => updateWhatsAppNumber(id, dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEYS.whatsapp.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.whatsapp.all });
      toast.success("Number updated successfully");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to update number" }),
  });
}

export function useDeleteWhatsAppNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWhatsAppNumber(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.whatsapp.all });
      toast.success("Number removed");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to delete number" }),
  });
}

export function useSendTestMessage(id: string) {
  return useMutation({
    mutationFn: (dto: SendTestMessageDto) => sendTestMessage(id, dto),
    onSuccess: ({ jobId }) => {
      toast.success(`Test message queued — Job ID: ${jobId}`);
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to send test message" }),
  });
}
