import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type { ApiResponse, AnalyticsOverview } from "@/types/api.types";

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const response = await apiClient.get<ApiResponse<AnalyticsOverview>>(
    API_ENDPOINTS.analytics.overview,
  );
  return response.data.data;
}
