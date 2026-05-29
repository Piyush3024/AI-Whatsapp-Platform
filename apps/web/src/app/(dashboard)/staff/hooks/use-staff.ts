import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getStaffSchedule,
  setStaffSchedule,
  getStaffOverrides,
  createStaffOverride,
  deleteStaffOverride,
} from "@/services/staff.service";
import { handleApiError } from "@/lib/handle-error";
import type {
  CreateStaffDto,
  UpdateStaffDto,
  SetStaffScheduleDto,
  CreateScheduleOverrideDto,
} from "@/types/staff.types";

// ─── List ─────────────────────────────────────────────────────────────────────

export function useStaffList(includeInactive = false) {
  return useQuery({
    queryKey: QUERY_KEYS.staff.list(),
    queryFn: () => getStaff(),
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export function useStaffDetail(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.staff.detail(id),
    queryFn: () => getStaffById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateStaffDto) => createStaff(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.staff.all });
      toast.success("Staff member created successfully");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to create staff" }),
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export function useUpdateStaff(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateStaffDto) => updateStaff(id, dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEYS.staff.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.staff.all });
      toast.success("Staff member updated successfully");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to update staff" }),
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStaff(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.staff.all });
      toast.success("Staff member removed");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to delete staff" }),
  });
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export function useStaffSchedule(staffId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.staff.schedule(staffId),
    queryFn: () => getStaffSchedule(staffId),
    enabled: !!staffId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSetStaffSchedule(staffId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SetStaffScheduleDto) => setStaffSchedule(staffId, dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEYS.staff.schedule(staffId), updated);
      toast.success("Schedule updated successfully");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to update schedule" }),
  });
}

// ─── Overrides ────────────────────────────────────────────────────────────────

export function useStaffOverrides(staffId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.staff.overrides(staffId),
    queryFn: () => getStaffOverrides(staffId),
    enabled: !!staffId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateStaffOverride(staffId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateScheduleOverrideDto) =>
      createStaffOverride(staffId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.staff.overrides(staffId),
      });
      toast.success("Override added successfully");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to add override" }),
  });
}

export function useDeleteStaffOverride(staffId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (overrideId: string) =>
      deleteStaffOverride(staffId, overrideId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.staff.overrides(staffId),
      });
      toast.success("Override removed");
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to remove override" }),
  });
}
