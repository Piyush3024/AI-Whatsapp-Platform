import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/constants/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type {
  Plan,
  Subscription,
  InvoiceListResponse,
  StripeCheckoutResponse,
  StripePortalResponse,
  EsewaInitiateResponse,
  TenantUsageSummary,
} from "@/types/billing.types";

export async function getPlans(): Promise<Plan[]> {
  const response = await apiClient.get<ApiResponse<Plan[]>>(
    API_ENDPOINTS.billing.plans,
  );
  return response.data.data;
}

export async function getCurrentSubscription(): Promise<Subscription> {
  const response = await apiClient.get<ApiResponse<Subscription>>(
    API_ENDPOINTS.billing.subscription,
  );
  return response.data.data;
}

export async function createStripeCheckoutSession(dto: {
  planId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<StripeCheckoutResponse> {
  const response = await apiClient.post<ApiResponse<StripeCheckoutResponse>>(
    API_ENDPOINTS.billing.stripeCheckout,
    dto,
  );
  return response.data.data;
}

export async function createStripePortalSession(dto: {
  returnUrl: string;
}): Promise<StripePortalResponse> {
  const response = await apiClient.post<ApiResponse<StripePortalResponse>>(
    API_ENDPOINTS.billing.stripePortal,
    dto,
  );
  return response.data.data;
}

export async function initiateEsewaPayment(dto: {
  planId: string;
}): Promise<EsewaInitiateResponse> {
  const response = await apiClient.post<ApiResponse<EsewaInitiateResponse>>(
    API_ENDPOINTS.billing.esewaInitiate,
    dto,
  );
  return response.data.data;
}

export async function getInvoices(params: {
  page?: number;
  limit?: number;
}): Promise<InvoiceListResponse> {
  const response = await apiClient.get<ApiResponse<InvoiceListResponse>>(
    API_ENDPOINTS.billing.invoices,
    { params },
  );
  return response.data.data;
}

export const getBillingUsage = async (): Promise<TenantUsageSummary> => {
  const res = await apiClient.get<{ data: TenantUsageSummary }>(
    API_ENDPOINTS.billing.usage,
  );
  return res.data.data;
};
