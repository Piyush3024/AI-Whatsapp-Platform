import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type { AiPrompt, UpsertAiPromptDto } from "@/types/ai-prompt.types";

export const getAiPrompts = async (): Promise<AiPrompt[]> => {
  const res = await apiClient.get<{ data: AiPrompt[] }>(
    API_ENDPOINTS.tenant.aiPrompts.list,
  );
  return res.data.data;
};

export const upsertAiPrompt = async (
  dto: UpsertAiPromptDto,
): Promise<AiPrompt> => {
  const res = await apiClient.post<{ data: AiPrompt }>(
    API_ENDPOINTS.tenant.aiPrompts.upsert,
    dto,
  );
  return res.data.data;
};

export const deleteAiPrompt = async (id: string): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.tenant.aiPrompts.delete(id));
};
