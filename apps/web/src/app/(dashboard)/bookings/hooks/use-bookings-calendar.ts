"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { useIsAuthReady } from "@/hooks/use-auth-ready";
import { getBookingsCalendar } from "@/services/booking.service";
import type { CalendarQuery, CalendarEvent } from "@/types/booking.types";
import type { Booking } from "@/types/booking.types";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "#f59e0b", text: "#ffffff" },
  CONFIRMED: { bg: "#10b981", text: "#ffffff" },
  COMPLETED: { bg: "#6366f1", text: "#ffffff" },
  CANCELLED: { bg: "#ef4444", text: "#ffffff" },
  NO_SHOW: { bg: "#6b7280", text: "#ffffff" },
};

export function bookingToCalendarEvent(booking: Booking): CalendarEvent {
  const customerLabel =
    booking.customer?.name ?? booking.customer?.phone ?? "Customer";
  const serviceLabel = booking.services?.[0]?.name ?? "";
  const title = serviceLabel
    ? `${customerLabel} — ${serviceLabel}`
    : customerLabel;

  return {
    id: booking.id,
    title,
    start: new Date(booking.startTime),
    end: new Date(booking.endTime),
    resource: booking,
  };
}

export function useBookingsCalendar(query: CalendarQuery) {
  const isReady = useIsAuthReady();

  const { data, isPending, isError } = useQuery({
    queryKey: QUERY_KEYS.bookings.calendar(
      query as unknown as Record<string, unknown>,
    ),
    queryFn: isReady ? () => getBookingsCalendar(query) : skipToken,
    staleTime: 1000 * 60,
  });

  const events: CalendarEvent[] = (data?.items ?? []).map(
    bookingToCalendarEvent,
  );

  return { events, isPending, isError };
}

export function getEventStyle(event: CalendarEvent) {
  const colors = STATUS_COLORS[event.resource.status] ?? STATUS_COLORS.PENDING;
  return {
    style: {
      backgroundColor: colors?.bg,
      color: colors?.text,
      border: "none",
    },
  };
}
