import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import type { BookingSource, BookingStatus } from "@/types/booking.types";

const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const satisfies BookingStatus[];

const BOOKING_SOURCES = [
  "WHATSAPP",
  "MANUAL",
  "ONLINE",
] as const satisfies BookingSource[];

export const bookingFilterParsers = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(20),
  status: parseAsStringLiteral(BOOKING_STATUSES).withOptions({
    clearOnDefault: true,
  }),
  staffId: parseAsString.withOptions({ clearOnDefault: true }),
  customerId: parseAsString.withOptions({ clearOnDefault: true }),
  locationId: parseAsString.withOptions({ clearOnDefault: true }),
  source: parseAsStringLiteral(BOOKING_SOURCES).withOptions({
    clearOnDefault: true,
  }),
  dateFrom: parseAsString.withOptions({ clearOnDefault: true }),
  dateTo: parseAsString.withOptions({ clearOnDefault: true }),
};
