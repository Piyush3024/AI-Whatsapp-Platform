import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type {
  WhatsAppNumber,
  WhatsAppListResponse,
  WhatsAppQuery,
  CreateWhatsAppNumberDto,
  UpdateWhatsAppNumberDto,
  SendTestMessageDto,
} from "@/types/whatsapp.types";

export async function getWhatsAppNumbers(
  params?: WhatsAppQuery,
): Promise<WhatsAppListResponse> {
  const response = await apiClient.get<ApiResponse<WhatsAppListResponse>>(
    API_ENDPOINTS.whatsapp.list,
    { params },
  );
  return response.data.data;
}

export async function getWhatsAppNumberById(
  id: string,
): Promise<WhatsAppNumber> {
  const response = await apiClient.get<ApiResponse<WhatsAppNumber>>(
    API_ENDPOINTS.whatsapp.detail(id),
  );
  return response.data.data;
}

export async function createWhatsAppNumber(
  dto: CreateWhatsAppNumberDto,
): Promise<WhatsAppNumber> {
  const response = await apiClient.post<ApiResponse<WhatsAppNumber>>(
    API_ENDPOINTS.whatsapp.create,
    dto,
  );
  return response.data.data;
}

export async function updateWhatsAppNumber(
  id: string,
  dto: UpdateWhatsAppNumberDto,
): Promise<WhatsAppNumber> {
  const response = await apiClient.patch<ApiResponse<WhatsAppNumber>>(
    API_ENDPOINTS.whatsapp.update(id),
    dto,
  );
  return response.data.data;
}

export async function deleteWhatsAppNumber(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.whatsapp.delete(id));
}

export async function sendTestMessage(
  id: string,
  dto: SendTestMessageDto,
): Promise<{ jobId: string }> {
  const response = await apiClient.post<ApiResponse<{ jobId: string }>>(
    API_ENDPOINTS.whatsapp.sendTest(id),
    dto,
  );
  return response.data.data;
}
