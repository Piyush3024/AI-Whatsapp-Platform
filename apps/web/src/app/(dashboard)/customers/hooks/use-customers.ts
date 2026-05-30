import {
  useQuery,
  useMutation,
  useQueryClient,
  skipToken,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import type {
  CustomerQuery,
  CreateCustomerDto,
  UpdateCustomerDto,
} from "@/types/customer.types";
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerConversations,
} from "@/services/customer.service";
import { useIsAuthReady } from "@/hooks/use-auth-ready";
import { handleApiError } from "@/lib/handle-error";

export function useCustomers(params: CustomerQuery) {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.customers.list(params),
    queryFn: isReady ? () => getCustomers(params) : skipToken,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.customers.detail(id),
    queryFn: () => getCustomer(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCustomerConversations(
  id: string,
  params?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: QUERY_KEYS.customers.conversations(id),
    queryFn: () => getCustomerConversations(id, params),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCustomerDto) => createCustomer(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.customers.all,
      });
      toast.success("Customer created successfully");
    },
    onError: (error) => {
      handleApiError({ error, fallbackMessage: "Failed to create customer" });
    },
  });
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateCustomerDto) => updateCustomer(id, dto),
    onSuccess: (updatedCustomer) => {
      queryClient.setQueryData(
        QUERY_KEYS.customers.detail(updatedCustomer.id),
        updatedCustomer,
      );
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.customers.all,
      });
      toast.success("Customer updated successfully");
    },
    onError: (error) => {
      handleApiError({ error, fallbackMessage: "Failed to update customer" });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.customers.all,
      });
      toast.success("Customer deleted successfully");
    },
    onError: (error) => {
      handleApiError({ error, fallbackMessage: "Failed to delete customer" });
    },
  });
}
