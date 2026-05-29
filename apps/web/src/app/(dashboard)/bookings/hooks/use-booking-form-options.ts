import { skipToken, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { getCustomers } from "@/services/customer.service";
import { getStaff } from "@/services/staff.service";
import { getServices } from "@/services/service.service";
import { useIsAuthReady } from "@/hooks/use-auth-ready";

export function useCustomerOptions(search?: string) {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.customers.list({ search, limit: 50 }),
    queryFn: isReady ? () => getCustomers({ search, limit: 50 }) : skipToken,
    staleTime: 1000 * 60 * 5,
  });
}

export function useStaffOptions() {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.staff.list(),
    queryFn: isReady ? () => getStaff() : skipToken,
    staleTime: 1000 * 60 * 10, // staff frequently change nahi hote
  });
}

export function useServiceOptions() {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.services.list(),
    queryFn: isReady ? () => getServices() : skipToken,
    staleTime: 1000 * 60 * 10, // services frequently change nahi hote
  });
}
