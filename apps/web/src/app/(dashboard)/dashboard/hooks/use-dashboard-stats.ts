import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { getAnalyticsOverview } from "@/services/analytics.service";
import { useAuthStore } from "@/stores/auth.store";

export function useDashboardStats() {
  const { isInitialized, accessToken } = useAuthStore();

  return useQuery({
    queryKey: QUERY_KEYS.analytics.overview,
    queryFn: getAnalyticsOverview,
    staleTime: 1000 * 60 * 5, // 5 minutes — analytics data frequently change nahi hota
    enabled: isInitialized && !!accessToken,
  });
}
