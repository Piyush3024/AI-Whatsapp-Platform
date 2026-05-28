import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type { CustomerListResponse } from "@/types/customer.types";

export async function getCustomers(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<CustomerListResponse> {
  const response = await apiClient.get<ApiResponse<CustomerListResponse>>(
    API_ENDPOINTS.customers.list,
    { params },
  );
  return response.data.data;
}
