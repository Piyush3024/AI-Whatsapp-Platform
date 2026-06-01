/**
 * Centralized route path definitions.
 *
 * Purpose:
 * - Prevent hardcoded path strings across the codebase
 * - Single source of truth for all navigation paths
 * - Enable autocomplete + type safety
 * - Easy refactoring — change once, reflects everywhere
 */
export const ROUTES = {
  // Auth
  auth: {
    login: "/login",
    register: "/register",
    logout: "/logout",
  },
  // Dashboard
  dashboard: "/dashboard",
  // Bookings
  bookings: {
    list: "/bookings",
    calendar: "/bookings/calendar",
    detail: (id: string) => `/bookings/${id}`,
    create: "/bookings/create",
  },
  // Customers
  customers: {
    list: "/customers",
    detail: (id: string) => `/customers/${id}`,
  },
  // Staff
  staff: {
    list: "/staff",
    detail: (id: string) => `/staff/${id}`,
  },
  // Services
  services: {
    list: "/services",
  },
  // Analytics
  analytics: "/analytics",
  // Knowledge Base
  knowledgeBase: "/knowledge-base",
  // WhatsApp
  whatsapp: "/whatsapp",
  // Settings
  settings: {
    root: "/settings",
    billing: "/settings/billing",
    auditLog: "/settings/audit-log",
  },
  // COnversations
  conversations: {
    list: "/conversations",
    detail: (id: string) => `/conversations/${id}`,
  },
} as const;
