import { skipToken, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { getAnalyticsOverview } from "@/services/analytics.service";
import { useIsAuthReady } from "@/hooks/use-auth-ready";

export function useDashboardStats() {
  const isReady = useIsAuthReady();

  return useQuery({
    queryKey: QUERY_KEYS.analytics.overview,
    queryFn: isReady ? () => getAnalyticsOverview : skipToken,
    staleTime: 1000 * 60 * 5, // 5 minutes — analytics data frequently change nahi hota
  });
}
