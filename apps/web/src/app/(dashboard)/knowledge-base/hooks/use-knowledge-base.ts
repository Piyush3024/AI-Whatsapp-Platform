import {
  useQuery,
  useMutation,
  useQueryClient,
  skipToken,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
} from "@/services/knowledge-base.service";
import { handleApiError } from "@/lib/handle-error";
import { useIsAuthReady } from "@/hooks/use-auth-ready";
import type {
  KnowledgeBaseQuery,
  UploadDocumentDto,
} from "@/types/knowledge-base.types";

export function useDocuments(params?: KnowledgeBaseQuery) {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.knowledgeBase.list(params),
    queryFn: isReady ? () => getDocuments(params) : skipToken,
    staleTime: 1000 * 60 * 2,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UploadDocumentDto) => uploadDocument(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.knowledgeBase.all,
      });
      toast.success("Document uploaded — embedding in progress");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Upload failed" }),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.knowledgeBase.all,
      });
      toast.success("Document deleted");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Delete failed" }),
  });
}
