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
} as const;
