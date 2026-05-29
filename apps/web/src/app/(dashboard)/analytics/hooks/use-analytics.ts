import { useQuery, skipToken } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  getAnalyticsOverview,
  getUsageStats,
  getMessageStats,
  getBookingStats,
} from "@/services/analytics.service";
import { useIsAuthReady } from "@/hooks/use-auth-ready";
import type { AnalyticsDateRange } from "@/types/analytics.types";

export function useAnalyticsOverview() {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.analytics.overview,
    queryFn: isReady ? () => getAnalyticsOverview() : skipToken,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUsageStats(params?: AnalyticsDateRange) {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.analytics.usage(params),
    queryFn: isReady ? () => getUsageStats(params) : skipToken,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMessageStats(params?: AnalyticsDateRange) {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.analytics.messages(params),
    queryFn: isReady ? () => getMessageStats(params) : skipToken,
    staleTime: 1000 * 60 * 5,
  });
}

export function useBookingStats(params?: AnalyticsDateRange) {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.analytics.bookings(params),
    queryFn: isReady ? () => getBookingStats(params) : skipToken,
    staleTime: 1000 * 60 * 5,
  });
}
