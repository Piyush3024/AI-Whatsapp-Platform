import type { UserRole } from "@/types/api.types";

export type Permission =
  | "billing:manage" // OWNER only
  | "members:manage" // OWNER only
  | "settings:manage" // OWNER + ADMIN
  | "staff:manage" // OWNER + ADMIN
  | "services:manage" // OWNER + ADMIN
  | "bookings:manage" // OWNER + ADMIN + STAFF
  | "bookings:view" // ALL
  | "customers:manage" // OWNER + ADMIN
  | "customers:view" // ALL
  | "analytics:view" // OWNER + ADMIN
  | "knowledge-base:manage" // OWNER + ADMIN
  | "whatsapp:manage" // OWNER + ADMIN
  | "locations:manage"; // OWNER + ADMIN

const ALL_PERMISSIONS: Permission[] = [
  "billing:manage",
  "members:manage",
  "settings:manage",
  "staff:manage",
  "services:manage",
  "bookings:manage",
  "bookings:view",
  "customers:manage",
  "customers:view",
  "analytics:view",
  "knowledge-base:manage",
  "whatsapp:manage",
  "locations:manage",
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: ALL_PERMISSIONS,
  ADMIN: ALL_PERMISSIONS.filter(
    (p) => p !== "billing:manage" && p !== "members:manage",
  ),
  STAFF: ["bookings:manage", "bookings:view", "customers:view"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
