// ============================================================
// API-side job payload types
// Worker ke job-payloads.ts se match karna MANDATORY hai
// ============================================================

export interface FollowUpJob {
  tenantId: string;
  bookingId: string;
  customerId: string;
  customerPhone: string;
  followUpType: 'post_appointment' | 're_booking';
  messageBody: string;
}
