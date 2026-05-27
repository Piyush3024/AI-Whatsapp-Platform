// Booking enums — backend se match
export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type BookingSource = "WHATSAPP" | "MANUAL" | "ONLINE";

// Nested shapes from transformBooking
export interface BookingCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface BookingStaff {
  id: string;
  name: string;
  phone?: string;
}

export interface BookingLocation {
  id: string;
  name: string;
  address?: string;
}

export interface BookingService {
  id: string;
  name: string;
  price: number; // paisa
  duration: number; // minutes
}

// Main Booking shape (from transformBooking)
export interface Booking {
  id: string;
  tenantId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  source: BookingSource;
  notes?: string;
  totalAmount: number; // paisa
  currency: string;
  createdAt: string;
  updatedAt: string;
  customer: BookingCustomer;
  staff?: BookingStaff;
  location?: BookingLocation;
  services: BookingService[];
}

// Pagination — backend returns { items, meta: { total, page, limit, totalPages } }
export interface BookingMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BookingListResponse {
  items: Booking[];
  meta: BookingMeta;
}

// Query params
export interface BookingQuery {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  staffId?: string;
  customerId?: string;
  locationId?: string;
  source?: BookingSource;
  dateFrom?: string;
  dateTo?: string;
}

// DTOs
export interface CreateBookingDto {
  customerId: string;
  serviceIds: string[];
  startTime: string; // ISO string
  staffId?: string;
  locationId?: string;
  notes?: string;
  source?: BookingSource;
}

export interface UpdateBookingDto {
  staffId?: string;
  locationId?: string;
  startTime?: string;
  notes?: string;
}

export interface UpdateBookingStatusDto {
  status: BookingStatus;
}
