// ─── Enums ────────────────────────────────────────────────────────────────────

export enum DayOfWeek {
  MONDAY = "MONDAY",
  TUESDAY = "TUESDAY",
  WEDNESDAY = "WEDNESDAY",
  THURSDAY = "THURSDAY",
  FRIDAY = "FRIDAY",
  SATURDAY = "SATURDAY",
  SUNDAY = "SUNDAY",
}

// ─── Core Models ──────────────────────────────────────────────────────────────

export interface Staff {
  id: string;
  tenantId: string;
  name: string;
  phone: string | null;
  email: string | null;
  locationId: string | null;
  userId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffOption {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  locationId: string | null;
  userId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface StaffSchedule {
  id: string;
  tenantId: string;
  staffId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isWorking: boolean;
}

export interface StaffScheduleOverride {
  id: string;
  tenantId: string;
  staffId: string;
  date: string; // ISO date string
  isWorking: boolean;
  startTime: string | null; // HH:MM or null
  endTime: string | null; // HH:MM or null
  reason: string | null;
  createdAt: string;
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateStaffDto {
  name: string;
  phone?: string;
  email?: string;
  locationId?: string;
  userId?: string;
  isActive?: boolean;
}

export interface UpdateStaffDto {
  name?: string;
  phone?: string;
  email?: string;
  locationId?: string;
  userId?: string;
  isActive?: boolean;
}

export interface ScheduleItemDto {
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isWorking: boolean;
}

export interface SetStaffScheduleDto {
  schedule: ScheduleItemDto[];
}

export interface CreateScheduleOverrideDto {
  date: string; // YYYY-MM-DD
  isWorking: boolean;
  startTime?: string; // HH:MM — required if isWorking: true
  endTime?: string; // HH:MM — required if isWorking: true
  reason?: string;
}

export interface StaffQuery {
  search?: string;
  includeInactive?: boolean;
}

// ─── Response shapes ──────────────────────────────────────────────────────────

/** GET /staff returns direct array — no pagination */
export type StaffListResponse = StaffOption[];

/** GET /staff/:id/schedule returns direct array */
export type StaffScheduleResponse = StaffSchedule[];

/** GET /staff/:id/overrides returns direct array */
export type StaffOverridesResponse = StaffScheduleOverride[];
