import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type { StaffOption } from "@/types/staff.types";

export async function getStaff(): Promise<StaffOption[]> {
  const response = await apiClient.get<ApiResponse<StaffOption[]>>(
    API_ENDPOINTS.staff.list,
  );
  return response.data.data;
}
