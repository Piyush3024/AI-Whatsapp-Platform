import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type {
  Tenant,
  TenantMember,
  Location,
  BusinessHour,
  UpdateTenantDto,
  UpdateMemberRoleDto,
  CreateLocationDto,
  UpdateLocationDto,
  SetBusinessHoursDto,
} from "@/types/tenant.types";

export async function getTenant(): Promise<Tenant> {
  const response = await apiClient.get<ApiResponse<Tenant>>(
    API_ENDPOINTS.tenant.me,
  );
  return response.data.data;
}

export async function updateTenant(dto: UpdateTenantDto): Promise<Tenant> {
  const response = await apiClient.patch<ApiResponse<Tenant>>(
    API_ENDPOINTS.tenant.update,
    dto,
  );
  return response.data.data;
}

export async function getMembers(): Promise<TenantMember[]> {
  const response = await apiClient.get<ApiResponse<TenantMember[]>>(
    API_ENDPOINTS.tenant.members,
  );
  return response.data.data;
}

export async function updateMemberRole(
  userId: string,
  dto: UpdateMemberRoleDto,
): Promise<TenantMember> {
  const response = await apiClient.patch<ApiResponse<TenantMember>>(
    API_ENDPOINTS.tenant.updateMemberRole(userId),
    dto,
  );
  return response.data.data;
}

export async function removeMember(
  userId: string,
): Promise<{ message: string }> {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(
    API_ENDPOINTS.tenant.removeMember(userId),
  );
  return response.data.data;
}

export async function getLocations(): Promise<Location[]> {
  const response = await apiClient.get<ApiResponse<Location[]>>(
    API_ENDPOINTS.tenant.locations,
  );
  return response.data.data;
}

export async function createLocation(
  dto: CreateLocationDto,
): Promise<Location> {
  const response = await apiClient.post<ApiResponse<Location>>(
    API_ENDPOINTS.tenant.locations,
    dto,
  );
  return response.data.data;
}

export async function updateLocation(
  id: string,
  dto: UpdateLocationDto,
): Promise<Location> {
  const response = await apiClient.patch<ApiResponse<Location>>(
    API_ENDPOINTS.tenant.location(id),
    dto,
  );
  return response.data.data;
}

export async function deleteLocation(id: string): Promise<{ message: string }> {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(
    API_ENDPOINTS.tenant.location(id),
  );
  return response.data.data;
}

export async function getBusinessHours(
  locationId: string,
): Promise<BusinessHour[]> {
  const response = await apiClient.get<ApiResponse<BusinessHour[]>>(
    API_ENDPOINTS.tenant.locationHours(locationId),
  );
  return response.data.data;
}

export async function setBusinessHours(
  locationId: string,
  dto: SetBusinessHoursDto,
): Promise<BusinessHour[]> {
  const response = await apiClient.put<ApiResponse<BusinessHour[]>>(
    API_ENDPOINTS.tenant.locationHours(locationId),
    dto,
  );
  return response.data.data;
}
