/**
 * Centralized TanStack Query keys.
 *
 * Purpose:
 * - Prevent hardcoded query key strings
 * - Ensure consistency across the application
 * - Improve cache invalidation reliability
 * - Provide autocomplete support
 *
 * Strategy:
 * Use hierarchical array keys instead of plain strings.
 * This allows fine-grained cache control.
 */

export const QUERY_KEYS = {
  /**
   * Authentication-related queries
   */
  auth: {
    currentUser: ["auth", "current-user"] as const,
  },

  /**
   * Analytics-related queries
   */
  analytics: {
    overview: ["analytics", "overview"] as const,
    messages: ["analytics", "messages"] as const,
    bookings: ["analytics", "bookings"] as const,
    usage: ["analytics", "usage"] as const,
  },

  /**
   * Bookings-related queries
   */

  bookings: {
    all: ["bookings"] as const,
    list: (params: unknown) => ["bookings", "list", params] as const,
    detail: (id: string) => ["bookings", "detail", id] as const,
  },

  /**
   * Customers-related queries
   */

  customers: {
    all: ["customers"] as const,
    list: (params: unknown) => ["customers", "list", params] as const,
    detail: (id: string) => ["customers", "detail", id] as const,
    conversations: (id: string) => ["customers", "conversations", id] as const,
  },

  /**
   * Staffs-related queries
   */
  staff: {
    all: ["staff"] as const,
    list: () => ["staff", "list"] as const,
    detail: (id: string) => ["staff", "detail", id] as const,
    schedule: (id: string) => ["staff", "schedule", id] as const,
    overrides: (id: string) => ["staff", "overrides", id] as const,
  },

  /**
   * Services-related queries
   */
  services: {
    all: ["services"] as const,
    list: () => ["services", "list"] as const,
  },
} as const;
