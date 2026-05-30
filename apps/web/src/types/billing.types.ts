// ─── Enums ────────────────────────────────────────────────────────────────────

export type InvoiceStatus = "PAID" | "UNPAID" | "VOID" | "DRAFT";

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "pending_esewa"
  | "incomplete";

// ─── Plan ─────────────────────────────────────────────────────────────────────

export interface PlanLimits {
  stripePriceId?: string;
  maxLocations?: number;
  maxStaff?: number;
  maxMessages?: number;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number; // paisa
  currency: string; // NPR / USD
  interval: string; // month / year
  limits: PlanLimits;
  isActive: boolean;
  createdAt: string;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  plan: Plan;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  id: string;
  type: string;
  description: string;
  quantity: number;
  unitAmount: number; // paisa
  totalAmount: number; // paisa
}

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId: string;
  stripeInvoiceId: string;
  totalAmount: number; // paisa
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  lineItems: InvoiceLineItem[];
  subscription: { plan: Plan } | null;
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── eSewa ────────────────────────────────────────────────────────────────────

export interface EsewaPaymentPayload {
  amount: string;
  tax_amount: string;
  total_amount: string;
  product_service_charge: string;
  product_delivery_charge: string;
  transaction_uuid: string;
  product_code: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
  esewa_url: string;
}

export interface EsewaInitiateResponse {
  transactionUuid: string;
  payload: EsewaPaymentPayload;
}

// ─── Stripe ───────────────────────────────────────────────────────────────────

export interface StripeCheckoutResponse {
  sessionId: string;
  url: string | null;
}

export interface StripePortalResponse {
  url: string;
}
