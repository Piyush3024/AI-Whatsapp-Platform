import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type {
  Booking,
  BookingListResponse,
  BookingQuery,
  CreateBookingDto,
  UpdateBookingDto,
  UpdateBookingStatusDto,
  CalendarQuery,
  CalendarResponse,
} from "@/types/booking.types";

export async function getBookings(
  params: BookingQuery,
): Promise<BookingListResponse> {
  const response = await apiClient.get<ApiResponse<BookingListResponse>>(
    API_ENDPOINTS.bookings.list,
    { params },
  );
  return response.data.data;
}

export async function getBooking(id: string): Promise<Booking> {
  const response = await apiClient.get<ApiResponse<Booking>>(
    API_ENDPOINTS.bookings.detail(id),
  );
  return response.data.data;
}

export async function createBooking(dto: CreateBookingDto): Promise<Booking> {
  const response = await apiClient.post<ApiResponse<Booking>>(
    API_ENDPOINTS.bookings.create,
    dto,
  );
  return response.data.data;
}

export async function updateBooking(
  id: string,
  dto: UpdateBookingDto,
): Promise<Booking> {
  const response = await apiClient.patch<ApiResponse<Booking>>(
    API_ENDPOINTS.bookings.update(id),
    dto,
  );
  return response.data.data;
}

export async function updateBookingStatus(
  id: string,
  dto: UpdateBookingStatusDto,
): Promise<Booking> {
  const response = await apiClient.patch<ApiResponse<Booking>>(
    API_ENDPOINTS.bookings.updateStatus(id),
    dto,
  );
  return response.data.data;
}

export async function deleteBooking(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.bookings.delete(id));
}

export const exportBookingsCsv = async (
  params?: BookingQuery,
): Promise<string> => {
  const res = await apiClient.get<string>(API_ENDPOINTS.bookings.export, {
    params,
    responseType: "text",
  });
  return res.data;
};

export const getBookingsCalendar = async (
  params: CalendarQuery,
): Promise<CalendarResponse> => {
  const res = await apiClient.get<{ data: CalendarResponse }>(
    API_ENDPOINTS.bookings.calendar,
    { params },
  );
  return res.data.data;
};
