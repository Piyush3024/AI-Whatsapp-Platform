"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  usePlans,
  useSubscription,
  useStripeCheckout,
  useEsewaPayment,
} from "../hooks/use-billing";
import { formatPrice } from "@/lib/utils";
import type { EsewaPaymentPayload } from "@/types/billing.types";

// eSewa requires a hidden form POST redirect — browser form submit
function submitEsewaForm(payload: EsewaPaymentPayload) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = payload.esewa_url;

  const fields: (keyof EsewaPaymentPayload)[] = [
    "amount",
    "tax_amount",
    "total_amount",
    "product_service_charge",
    "product_delivery_charge",
    "transaction_uuid",
    "product_code",
    "success_url",
    "failure_url",
    "signed_field_names",
    "signature",
  ];

  for (const key of fields) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = payload[key];
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

export function PlansList() {
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: subscription } = useSubscription();
  const stripeCheckout = useStripeCheckout();
  const esewaPayment = useEsewaPayment();

  const currentPlanId = subscription?.planId;

  function handleStripe(planId: string) {
    void stripeCheckout.mutateAsync({
      planId,
      successUrl: `${window.location.origin}/settings/billing?success=true`,
      cancelUrl: window.location.href,
    });
  }

  async function handleEsewa(planId: string) {
    const result = await esewaPayment.mutateAsync({ planId });
    submitEsewaForm(result.payload);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Plans</CardTitle>
      </CardHeader>
      <CardContent>
        {plansLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        ) : !plans?.length ? (
          <p className="text-muted-foreground text-sm">No plans available.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              const isNPR = plan.currency === "NPR";

              return (
                <div
                  key={plan.id}
                  className={`rounded-lg border p-4 space-y-3 ${isCurrent ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{plan.name}</h3>
                    {isCurrent && <Badge>Current</Badge>}
                  </div>
                  <div>
                    <span className="text-2xl font-bold">
                      {formatPrice(plan.price)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      /{plan.interval}
                    </span>
                  </div>
                  {plan.description && (
                    <p className="text-muted-foreground text-sm">
                      {plan.description}
                    </p>
                  )}
                  <div className="text-muted-foreground space-y-1 text-xs">
                    {plan.limits.maxMessages && (
                      <p>
                        {plan.limits.maxMessages.toLocaleString()} messages/mo
                      </p>
                    )}
                    {plan.limits.maxStaff && (
                      <p>{plan.limits.maxStaff} staff members</p>
                    )}
                    {plan.limits.maxLocations && (
                      <p>{plan.limits.maxLocations} locations</p>
                    )}
                  </div>
                  {!isCurrent && (
                    <div className="space-y-2 pt-1">
                      {/* Stripe — for non-NPR or if stripePriceId exists */}
                      {plan.limits.stripePriceId && (
                        <Button
                          className="w-full"
                          size="sm"
                          disabled={stripeCheckout.isPending}
                          onClick={() => handleStripe(plan.id)}
                        >
                          {stripeCheckout.isPending
                            ? "Redirecting..."
                            : "Pay with Card"}
                        </Button>
                      )}
                      {/* eSewa — NPR plans only */}
                      {isNPR && (
                        <Button
                          className="w-full"
                          size="sm"
                          variant="outline"
                          disabled={esewaPayment.isPending}
                          onClick={() => void handleEsewa(plan.id)}
                        >
                          {esewaPayment.isPending
                            ? "Redirecting..."
                            : "Pay with eSewa"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
