import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from "@/services/service.service";
import { handleApiError } from "@/lib/handle-error";
import type {
  ServiceQuery,
  CreateServiceDto,
  UpdateServiceDto,
} from "@/types/service.types";

export function useServiceList(params?: ServiceQuery) {
  return useQuery({
    queryKey: QUERY_KEYS.services.list(params),
    queryFn: () => getServices(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useServiceDetail(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.services.detail(id),
    queryFn: () => getServiceById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateServiceDto) => createService(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.services.all });
      toast.success("Service created successfully");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to create service" }),
  });
}

export function useUpdateService(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateServiceDto) => updateService(id, dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEYS.services.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.services.all });
      toast.success("Service updated successfully");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to update service" }),
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.services.all });
      toast.success("Service removed");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to delete service" }),
  });
}
