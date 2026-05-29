import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type {
  Service,
  ServiceListResponse,
  ServiceQuery,
  CreateServiceDto,
  UpdateServiceDto,
} from "@/types/service.types";

export async function getServices(
  params?: ServiceQuery,
): Promise<ServiceListResponse> {
  const response = await apiClient.get<ApiResponse<ServiceListResponse>>(
    API_ENDPOINTS.services.list,
    { params },
  );
  return response.data.data;
}

export async function getServiceById(id: string): Promise<Service> {
  const response = await apiClient.get<ApiResponse<Service>>(
    API_ENDPOINTS.services.detail(id),
  );
  return response.data.data;
}

export async function createService(dto: CreateServiceDto): Promise<Service> {
  const response = await apiClient.post<ApiResponse<Service>>(
    API_ENDPOINTS.services.create,
    dto,
  );
  return response.data.data;
}

export async function updateService(
  id: string,
  dto: UpdateServiceDto,
): Promise<Service> {
  const response = await apiClient.patch<ApiResponse<Service>>(
    API_ENDPOINTS.services.update(id),
    dto,
  );
  return response.data.data;
}

export async function deleteService(id: string): Promise<{ message: string }> {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(
    API_ENDPOINTS.services.delete(id),
  );
  return response.data.data;
}
