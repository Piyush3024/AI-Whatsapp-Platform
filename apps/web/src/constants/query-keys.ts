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
    messages: (params?: unknown) => ["analytics", "messages", params] as const,
    bookings: (params?: unknown) => ["analytics", "bookings", params] as const,
    usage: (params?: unknown) => ["analytics", "usage", params] as const,
  },

  /**
   * Bookings-related queries
   */

  bookings: {
    all: ["bookings"] as const,
    list: (params: unknown) => ["bookings", "list", params] as const,
    detail: (id: string) => ["bookings", "detail", id] as const,
    calendar: (params?: Record<string, unknown>) =>
      ["bookings", "calendar", params] as const,
  },

  /**
   * Customers-related queries
   */

  customers: {
    all: ["customers"] as const,
    list: (params?: unknown) => ["customers", "list", params] as const,
    detail: (id: string) => ["customers", "detail", id] as const,
    conversations: (id: string) => ["customers", "conversations", id] as const,
  },

  /**
   * Staffs-related queries
   */
  staff: {
    all: ["staff"] as const,
    list: (params?: unknown) => ["staff", "list", params] as const,
    detail: (id: string) => ["staff", "detail", id] as const,
    schedule: (id: string) => ["staff", "schedule", id] as const,
    overrides: (id: string) => ["staff", "overrides", id] as const,
  },

  /**
   * Services-related queries
   */
  services: {
    all: ["services"] as const,
    list: (params?: unknown) => ["services", "list", params] as const,
    detail: (id: string) => ["services", "detail", id] as const,
  },

  /**
   * Knowledge base-related queries
   */
  knowledgeBase: {
    all: ["knowledge-base"] as const,
    list: (params?: unknown) => ["knowledge-base", "list", params] as const,
    detail: (id: string) => ["knowledge-base", "detail", id] as const,
  },

  /**
   * WhatsApp-related queries
   */
  whatsapp: {
    all: ["whatsapp"] as const,
    list: (params?: unknown) => ["whatsapp", "list", params] as const,
    detail: (id: string) => ["whatsapp", "detail", id] as const,
  },

  /**
   * Tenant-related queries
   */

  tenant: {
    me: ["tenant", "me"] as const,
    members: ["tenant", "members"] as const,
    locations: ["tenant", "locations"] as const,
    locationHours: (id: string) => ["tenant", "location-hours", id] as const,
    aiPrompts: {
      all: ["ai-prompts"] as const,
      list: ["ai-prompts", "list"] as const,
    },
  },

  /**
   * Billing-related queries
   */

  billing: {
    plans: ["billing", "plans"] as const,
    subscription: ["billing", "subscription"] as const,
    invoices: (params?: unknown) => ["billing", "invoices", params] as const,
    usage: ["billing", "usage"] as const,
  },

  /**
   * Conversations-related queries
   */

  conversations: {
    all: ["conversations"] as const,
    list: (params?: Record<string, unknown>) =>
      ["conversations", "list", params] as const,
    detail: (id: string) => ["conversations", "detail", id] as const,
    messages: (id: string, cursor?: string) =>
      ["conversations", "messages", id, cursor] as const,
  },

  /**
   * Notifications-related queries
   */

  notifications: {
    all: ["notifications"] as const,
    list: (params?: Record<string, unknown>) =>
      ["notifications", "list", params] as const,
    unreadCount: ["notifications", "unread-count"] as const,
  },

  /**
   * Audit-related queries
   */
  auditLogs: (params?: Record<string, unknown>) =>
    ["audit-logs", params] as const,
} as const;
