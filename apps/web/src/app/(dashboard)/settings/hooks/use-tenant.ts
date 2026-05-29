import {
  useQuery,
  useMutation,
  useQueryClient,
  skipToken,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  getTenant,
  updateTenant,
  getMembers,
  updateMemberRole,
  removeMember,
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getBusinessHours,
  setBusinessHours,
} from "@/services/tenant.service";
import { handleApiError } from "@/lib/handle-error";
import { useIsAuthReady } from "@/hooks/use-auth-ready";
import type {
  UpdateTenantDto,
  UpdateMemberRoleDto,
  CreateLocationDto,
  UpdateLocationDto,
  SetBusinessHoursDto,
} from "@/types/tenant.types";

export function useTenant() {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.tenant.me,
    queryFn: isReady ? () => getTenant() : skipToken,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateTenantDto) => updateTenant(dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEYS.tenant.me, updated);
      toast.success("Settings saved");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to save settings" }),
  });
}

export function useMembers() {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.tenant.members,
    queryFn: isReady ? () => getMembers() : skipToken,
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      dto,
    }: {
      userId: string;
      dto: UpdateMemberRoleDto;
    }) => updateMemberRole(userId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.tenant.members,
      });
      toast.success("Role updated");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to update role" }),
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeMember(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.tenant.members,
      });
      toast.success("Member removed");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to remove member" }),
  });
}

export function useLocations() {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.tenant.locations,
    queryFn: isReady ? () => getLocations() : skipToken,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateLocationDto) => createLocation(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.tenant.locations,
      });
      toast.success("Location created");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to create location" }),
  });
}

export function useUpdateLocation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateLocationDto) => updateLocation(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.tenant.locations,
      });
      toast.success("Location updated");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to update location" }),
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLocation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.tenant.locations,
      });
      toast.success("Location deleted");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to delete location" }),
  });
}

export function useBusinessHours(locationId: string) {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.tenant.locationHours(locationId),
    queryFn:
      isReady && locationId ? () => getBusinessHours(locationId) : skipToken,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSetBusinessHours(locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SetBusinessHoursDto) => setBusinessHours(locationId, dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        QUERY_KEYS.tenant.locationHours(locationId),
        updated,
      );
      toast.success("Business hours updated");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to update hours" }),
  });
}
