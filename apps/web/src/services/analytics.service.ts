import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type { AnalyticsOverview } from "@/types/analytics.types";

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const response = await apiClient.get<ApiResponse<AnalyticsOverview>>(
    API_ENDPOINTS.analytics.overview,
  );
  return response.data.data;
}
