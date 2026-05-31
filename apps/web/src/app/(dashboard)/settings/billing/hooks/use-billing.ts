import { useQuery, useMutation, skipToken } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  getPlans,
  getCurrentSubscription,
  createStripeCheckoutSession,
  createStripePortalSession,
  initiateEsewaPayment,
  getInvoices,
  getBillingUsage,
} from "@/services/billing.service";
import { handleApiError } from "@/lib/handle-error";
import { useIsAuthReady } from "@/hooks/use-auth-ready";

export function usePlans() {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.billing.plans,
    queryFn: isReady ? () => getPlans() : skipToken,
    staleTime: 1000 * 60 * 10,
  });
}

export function useSubscription() {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.billing.subscription,
    queryFn: isReady ? () => getCurrentSubscription() : skipToken,
    staleTime: 1000 * 60 * 5,
    retry: false, // 404 = no subscription — don't retry
  });
}

export function useInvoices(page = 1, limit = 20) {
  const isReady = useIsAuthReady();
  return useQuery({
    queryKey: QUERY_KEYS.billing.invoices({ page, limit }),
    queryFn: isReady ? () => getInvoices({ page, limit }) : skipToken,
    staleTime: 1000 * 60 * 5,
  });
}

export function useStripeCheckout() {
  return useMutation({
    mutationFn: createStripeCheckoutSession,
    onSuccess: ({ url }) => {
      if (url) window.location.href = url;
    },
    onError: (error) =>
      handleApiError({ error, fallbackMessage: "Failed to start checkout" }),
  });
}

export function useStripePortal() {
  return useMutation({
    mutationFn: createStripePortalSession,
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (error) =>
      handleApiError({
        error,
        fallbackMessage: "Failed to open billing portal",
      }),
  });
}

export function useEsewaPayment() {
  return useMutation({
    mutationFn: initiateEsewaPayment,
    onError: (error) =>
      handleApiError({
        error,
        fallbackMessage: "Failed to initiate eSewa payment",
      }),
  });
}

export function useBillingUsage() {
  const isReady = useIsAuthReady();

  return useQuery({
    queryKey: QUERY_KEYS.billing.usage,
    queryFn: isReady ? getBillingUsage : skipToken,
    staleTime: 1000 * 60 * 2,
  });
}
