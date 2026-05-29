import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type {
  KnowledgeBaseDocument,
  KnowledgeBaseListResponse,
  KnowledgeBaseQuery,
  UploadDocumentDto,
} from "@/types/knowledge-base.types";

export async function getDocuments(
  params?: KnowledgeBaseQuery,
): Promise<KnowledgeBaseListResponse> {
  const response = await apiClient.get<ApiResponse<KnowledgeBaseListResponse>>(
    API_ENDPOINTS.knowledgeBase.list,
    { params },
  );
  return response.data.data;
}

export async function getDocumentById(
  id: string,
): Promise<KnowledgeBaseDocument> {
  const response = await apiClient.get<ApiResponse<KnowledgeBaseDocument>>(
    API_ENDPOINTS.knowledgeBase.detail(id),
  );
  return response.data.data;
}

export async function uploadDocument(
  dto: UploadDocumentDto,
  onProgress?: (percent: number) => void,
): Promise<KnowledgeBaseDocument> {
  const formData = new FormData();
  formData.append("title", dto.title);
  formData.append("fileName", dto.fileName);
  formData.append("file", dto.file);

  const response = await apiClient.post<ApiResponse<KnowledgeBaseDocument>>(
    API_ENDPOINTS.knowledgeBase.upload,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    },
  );
  return response.data.data;
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.knowledgeBase.delete(id));
}
