import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type {
  CreateStaffDto,
  UpdateStaffDto,
  SetStaffScheduleDto,
  CreateScheduleOverrideDto,
  StaffListResponse,
  StaffScheduleResponse,
  StaffOverridesResponse,
  Staff,
  StaffScheduleOverride,
  StaffOption,
} from "@/types/staff.types";

export async function getStaff(): Promise<StaffOption[]> {
  const response = await apiClient.get<ApiResponse<StaffOption[]>>(
    API_ENDPOINTS.staff.list,
  );
  return response.data.data;
}

export async function getStaffById(id: string): Promise<Staff> {
  const response = await apiClient.get<ApiResponse<Staff>>(
    API_ENDPOINTS.staff.detail(id),
  );
  return response.data.data;
}

export async function createStaff(dto: CreateStaffDto): Promise<Staff> {
  const response = await apiClient.post<ApiResponse<Staff>>(
    API_ENDPOINTS.staff.create,
    dto,
  );
  return response.data.data;
}

export async function updateStaff(
  id: string,
  dto: UpdateStaffDto,
): Promise<Staff> {
  const response = await apiClient.patch<ApiResponse<Staff>>(
    API_ENDPOINTS.staff.update(id),
    dto,
  );
  return response.data.data;
}

export async function deleteStaff(id: string): Promise<{ message: string }> {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(
    API_ENDPOINTS.staff.delete(id),
  );
  return response.data.data;
}

export async function getStaffSchedule(
  id: string,
): Promise<StaffScheduleResponse> {
  const response = await apiClient.get<ApiResponse<StaffScheduleResponse>>(
    API_ENDPOINTS.staff.schedule(id),
  );
  return response.data.data;
}

export async function setStaffSchedule(
  id: string,
  dto: SetStaffScheduleDto,
): Promise<StaffScheduleResponse> {
  const response = await apiClient.put<ApiResponse<StaffScheduleResponse>>(
    API_ENDPOINTS.staff.schedule(id),
    dto,
  );
  return response.data.data;
}

export async function getStaffOverrides(
  id: string,
): Promise<StaffOverridesResponse> {
  const response = await apiClient.get<ApiResponse<StaffOverridesResponse>>(
    API_ENDPOINTS.staff.overrides(id),
  );
  return response.data.data;
}

export async function createStaffOverride(
  id: string,
  dto: CreateScheduleOverrideDto,
): Promise<StaffScheduleOverride> {
  const response = await apiClient.post<ApiResponse<StaffScheduleOverride>>(
    API_ENDPOINTS.staff.overrides(id),
    dto,
  );
  return response.data.data;
}

export async function deleteStaffOverride(
  id: string,
  overrideId: string,
): Promise<{ message: string }> {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(
    API_ENDPOINTS.staff.deleteOverride(id, overrideId),
  );
  return response.data.data;
}
