/**
 * Centralized API endpoint definitions.
 *
 * Purpose:
 * - Prevent hardcoded endpoint strings across the codebase
 * - Improve maintainability
 * - Enable autocomplete + type safety
 * - Reduce typo-related bugs
 *
 * Strategy:
 * Group endpoints by domain (auth, vendors, products, orders, etc.)
 * for better modular scaling.
 */
export const API_ENDPOINTS = {
  /**
   * Authentication-related endpoints
   */
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
    me: "/auth/me",
  },

  /**
   * Analytics-related endpoints
   */
  analytics: {
    overview: "/analytics/overview",
    messages: "/analytics/messages",
    bookings: "/analytics/bookings",
    usage: "/analytics/usage",
  },

  /**
   * Bookings-related endpoints
   */

  bookings: {
    list: "/bookings",
    detail: (id: string) => `/bookings/${id}`,
    create: "/bookings",
    update: (id: string) => `/bookings/${id}`,
    updateStatus: (id: string) => `/bookings/${id}/status`,
    delete: (id: string) => `/bookings/${id}`,
  },
} as const;
