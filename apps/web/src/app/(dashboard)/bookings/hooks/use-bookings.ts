import {
  skipToken,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import type {
  BookingQuery,
  CreateBookingDto,
  UpdateBookingStatusDto,
} from "@/types/booking.types";
import {
  getBookings,
  getBooking,
  createBooking,
  updateBookingStatus,
  deleteBooking,
} from "@/services/booking.service";
import { useIsAuthReady } from "@/hooks/use-auth-ready";

export function useBookings(params: BookingQuery) {
  const isReady = useIsAuthReady();

  return useQuery({
    queryKey: QUERY_KEYS.bookings.list(params),
    queryFn: isReady ? () => getBookings(params) : skipToken,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.bookings.detail(id),
    queryFn: () => getBooking(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateBookingDto) => createBooking(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.bookings.all,
      });
      toast.success("Booking created successfully");
    },
    onError: () => {
      toast.error("Failed to create booking");
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateBookingStatusDto }) =>
      updateBookingStatus(id, dto),
    onSuccess: (updatedBooking) => {
      // Update detail cache directly — no refetch needed
      queryClient.setQueryData(
        QUERY_KEYS.bookings.detail(updatedBooking.id),
        updatedBooking,
      );
      // Invalidate list — status change affects filters
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.bookings.all,
      });
      toast.success("Booking status updated");
    },
    onError: () => {
      toast.error("Failed to update booking status");
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBooking(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.bookings.all,
      });
      toast.success("Booking deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete booking");
    },
  });
}
