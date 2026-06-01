import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type {
  PaginatedAuditLogs,
  AuditLogQueryParams,
} from "@/types/audit-log.types";

export const getAuditLogs = async (
  params?: AuditLogQueryParams,
): Promise<PaginatedAuditLogs> => {
  const res = await apiClient.get<{ data: PaginatedAuditLogs }>(
    API_ENDPOINTS.auditLogs,
    { params },
  );
  return res.data.data;
};
