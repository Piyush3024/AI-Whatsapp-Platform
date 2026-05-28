import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type { ServiceOption } from "@/types/service.types";

export async function getServices(): Promise<ServiceOption[]> {
  const response = await apiClient.get<ApiResponse<ServiceOption[]>>(
    API_ENDPOINTS.services.list,
  );
  return response.data.data;
}
