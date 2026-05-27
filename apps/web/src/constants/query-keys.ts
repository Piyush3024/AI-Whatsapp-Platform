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
} as const;
