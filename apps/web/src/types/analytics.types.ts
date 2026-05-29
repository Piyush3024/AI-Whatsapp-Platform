// ─── Query Params ─────────────────────────────────────────────────────────────

export interface AnalyticsDateRange {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  locationId?: string;
}

// ─── Overview ─────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  totalBookings: number;
  totalCustomers: number;
  totalRevenuePaisa: number;
  totalMessages: number;
  activeStaff: number;
  totalLocations: number;
}

// ─── Usage ────────────────────────────────────────────────────────────────────

export interface DailyUsageRow {
  date: string;
  inboundMessages: number;
  outboundMessages: number;
  aiReplies: number;
  bookingsCreated: number;
}

export type UsageStatsResponse = DailyUsageRow[];

// ─── Messages ─────────────────────────────────────────────────────────────────

export interface MessageStatRow {
  date: string;
  direction: "INBOUND" | "OUTBOUND";
  count: number;
}

export type MessageStatsResponse = MessageStatRow[];

// ─── Bookings ─────────────────────────────────────────────────────────────────

export interface BookingByStatus {
  status: string;
  count: number;
  totalAmountPaisa: number;
}

export interface BookingByLocation {
  locationId: string | null;
  locationName: string;
  count: number;
  totalAmountPaisa: number;
}

export interface BookingStatsResponse {
  byStatus: BookingByStatus[];
  byLocation: BookingByLocation[];
  totalRevenuePaisa: number;
}
