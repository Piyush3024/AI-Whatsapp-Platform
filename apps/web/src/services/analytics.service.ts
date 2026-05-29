import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type {
  AnalyticsOverview,
  AnalyticsDateRange,
  UsageStatsResponse,
  MessageStatsResponse,
  BookingStatsResponse,
} from "@/types/analytics.types";

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const response = await apiClient.get<ApiResponse<AnalyticsOverview>>(
    API_ENDPOINTS.analytics.overview,
  );
  return response.data.data;
}

export async function getUsageStats(
  params?: AnalyticsDateRange,
): Promise<UsageStatsResponse> {
  const response = await apiClient.get<ApiResponse<UsageStatsResponse>>(
    API_ENDPOINTS.analytics.usage,
    { params },
  );
  return response.data.data;
}

export async function getMessageStats(
  params?: AnalyticsDateRange,
): Promise<MessageStatsResponse> {
  const response = await apiClient.get<ApiResponse<MessageStatsResponse>>(
    API_ENDPOINTS.analytics.messages,
    { params },
  );
  return response.data.data;
}

export async function getBookingStats(
  params?: AnalyticsDateRange,
): Promise<BookingStatsResponse> {
  const response = await apiClient.get<ApiResponse<BookingStatsResponse>>(
    API_ENDPOINTS.analytics.bookings,
    { params },
  );
  return response.data.data;
}
