import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type {
  Customer,
  CustomerListResponse,
  CustomerConversationListResponse,
  CreateCustomerDto,
  UpdateCustomerDto,
} from "@/types/customer.types";

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

export async function getCustomer(id: string): Promise<Customer> {
  const response = await apiClient.get<ApiResponse<Customer>>(
    API_ENDPOINTS.customers.detail(id),
  );
  return response.data.data;
}

export async function createCustomer(
  dto: CreateCustomerDto,
): Promise<Customer> {
  const response = await apiClient.post<ApiResponse<Customer>>(
    API_ENDPOINTS.customers.create,
    dto,
  );
  return response.data.data;
}

export async function updateCustomer(
  id: string,
  dto: UpdateCustomerDto,
): Promise<Customer> {
  const response = await apiClient.patch<ApiResponse<Customer>>(
    API_ENDPOINTS.customers.update(id),
    dto,
  );
  return response.data.data;
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.customers.delete(id));
}

export async function getCustomerConversations(
  id: string,
  params?: { page?: number; limit?: number },
): Promise<CustomerConversationListResponse> {
  const response = await apiClient.get<
    ApiResponse<CustomerConversationListResponse>
  >(API_ENDPOINTS.customers.conversations(id), { params });
  return response.data.data;
}
