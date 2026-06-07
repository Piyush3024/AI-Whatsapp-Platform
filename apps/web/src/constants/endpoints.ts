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
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    verifyEmail: "/auth/verify-email",
    resendVerification: "/auth/resend-verification",
    twoFactor: {
      setup: "/auth/2fa/setup",
      enable: "/auth/2fa/enable",
      disable: "/auth/2fa/disable",
      verifyLogin: "/auth/2fa/verify-login",
    },
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
    export: "/bookings/export",
    calendar: "/bookings/calendar",
  },

  /**
   * Customers-related endpoints
   */

  customers: {
    list: "/customers",
    detail: (id: string) => `/customers/${id}`,
    create: "/customers",
    update: (id: string) => `/customers/${id}`,
    delete: (id: string) => `/customers/${id}`,
    conversations: (id: string) => `/customers/${id}/conversations`,
    export: "/customers/export",
    import: "/customers/import",
  },

  /**
   * Staff-related endpoints
   */
  staff: {
    list: "/staff",
    detail: (id: string) => `/staff/${id}`,
    create: "/staff",
    update: (id: string) => `/staff/${id}`,
    delete: (id: string) => `/staff/${id}`,
    schedule: (id: string) => `/staff/${id}/schedule`,
    overrides: (id: string) => `/staff/${id}/overrides`,
    deleteOverride: (id: string, overrideId: string) =>
      `/staff/${id}/overrides/${overrideId}`,
  },

  /**
   * Service-related endpoints
   */
  services: {
    list: "/services",
    detail: (id: string) => `/services/${id}`,
    create: "/services",
    update: (id: string) => `/services/${id}`,
    delete: (id: string) => `/services/${id}`,
  },

  /**
   * Knowledge base-related endpoints
   */

  knowledgeBase: {
    list: "/knowledge-base/documents",
    detail: (id: string) => `/knowledge-base/documents/${id}`,
    upload: "/knowledge-base/documents",
    delete: (id: string) => `/knowledge-base/documents/${id}`,
  },

  /**
   * WhatsApp-related endpoints
   */

  whatsapp: {
    list: "/whatsapp-numbers",
    detail: (id: string) => `/whatsapp-numbers/${id}`,
    create: "/whatsapp-numbers",
    update: (id: string) => `/whatsapp-numbers/${id}`,
    delete: (id: string) => `/whatsapp-numbers/${id}`,
    sendTest: (id: string) => `/whatsapp-numbers/${id}/test`,
  },

  /**
   * Tenant-related endpoints
   */

  tenant: {
    me: "/tenant/me",
    update: "/tenant/me",
    members: "/tenant/members",
    updateMemberRole: (userId: string) => `/tenant/members/${userId}/role`,
    removeMember: (userId: string) => `/tenant/members/${userId}`,
    locations: "/tenant/locations",
    location: (id: string) => `/tenant/locations/${id}`,
    locationHours: (id: string) => `/tenant/locations/${id}/hours`,
    aiPrompts: {
      list: "/tenant/ai-prompts",
      upsert: "/tenant/ai-prompts",
      delete: (id: string) => `/tenant/ai-prompts/${id}`,
    },
  },

  /**
   * Billing-related endpoints
   */

  billing: {
    plans: "/billing/plans",
    subscription: "/billing/subscription",
    stripeCheckout: "/billing/stripe/checkout",
    stripePortal: "/billing/stripe/portal",
    esewaInitiate: "/billing/esewa/initiate",
    invoices: "/billing/invoices",
    usage: "/billing/usage",
  },

  /**
   * Audit-related endpoints
   */

  auditLogs: "/tenant/audit-logs",

  /**
   * Conversations-related endpoints
   */

  conversations: {
    list: "/conversations",
    detail: (id: string) => `/conversations/${id}`,
    messages: (id: string) => `/conversations/${id}/messages`,
    updateStatus: (id: string) => `/conversations/${id}`,
  },

  /**
   * Notifications-related endpoints
   */
  notifications: {
    list: "/notifications",
    unreadCount: "/notifications/unread-count",
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: "/notifications/mark-all-read",
  },
} as const;
