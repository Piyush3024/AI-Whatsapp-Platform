"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { useIsAuthReady } from "@/hooks/use-auth-ready";
import { getAuditLogs } from "@/services/audit-log.service";
import type { AuditLogQueryParams } from "@/types/audit-log.types";

export function useAuditLogs(params?: AuditLogQueryParams) {
  const isReady = useIsAuthReady();

  return useQuery({
    queryKey: QUERY_KEYS.auditLogs(
      params ? (params as Record<string, unknown>) : undefined,
    ),
    queryFn: isReady ? () => getAuditLogs(params) : skipToken,
    staleTime: 1000 * 60,
  });
}
