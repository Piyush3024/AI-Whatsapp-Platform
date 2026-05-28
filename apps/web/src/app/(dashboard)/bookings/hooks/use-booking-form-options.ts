import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { getCustomers } from "@/services/customer.service";
import { getStaff } from "@/services/staff.service";
import { getServices } from "@/services/service.service";

export function useCustomerOptions(search?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.customers.list({ search, limit: 50 }),
    queryFn: () => getCustomers({ search, limit: 50 }),
    staleTime: 1000 * 60 * 5,
  });
}

export function useStaffOptions() {
  return useQuery({
    queryKey: QUERY_KEYS.staff.list(),
    queryFn: () => getStaff(),
    staleTime: 1000 * 60 * 10, // staff frequently change nahi hote
  });
}

export function useServiceOptions() {
  return useQuery({
    queryKey: QUERY_KEYS.services.list(),
    queryFn: () => getServices(),
    staleTime: 1000 * 60 * 10, // services frequently change nahi hote
  });
}
