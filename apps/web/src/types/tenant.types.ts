import { DayOfWeek } from "./staff.types";

// ─── Enums ────────────────────────────────────────────────────────────────────

export { DayOfWeek };

export type TenantStatus = "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";

export type UserRole = "OWNER" | "ADMIN" | "STAFF";

export type MemberStatus = "ACTIVE" | "INACTIVE" | "INVITED";

// ─── Core Models ──────────────────────────────────────────────────────────────

export interface TenantSettings {
  timezone?: string;
  currency?: string;
  language?: string;
  [key: string]: unknown;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMember {
  id: string;
  userId: string;
  role: UserRole;
  status: MemberStatus;
  createdAt: string;
}

export interface Location {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  phone: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHour {
  id: string;
  tenantId: string;
  locationId: string;
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface UpdateTenantDto {
  name?: string;
  settings?: TenantSettings;
}

export interface UpdateMemberRoleDto {
  role: UserRole;
}

export interface CreateLocationDto {
  name: string;
  address?: string;
  phone?: string;
  isDefault?: boolean;
}

export interface UpdateLocationDto {
  name?: string;
  address?: string;
  phone?: string;
  isDefault?: boolean;
}

export interface BusinessHourItemDto {
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export interface SetBusinessHoursDto {
  hours: BusinessHourItemDto[];
}
