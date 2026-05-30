"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useSubscription, useStripePortal } from "../hooks/use-billing";
import { formatPrice } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  trialing: "outline",
  past_due: "destructive",
  canceled: "secondary",
  pending_esewa: "outline",
  incomplete: "outline",
};

export function CurrentPlanCard() {
  const { data: subscription, isLoading } = useSubscription();
  const portal = useStripePortal();

  function handleManage() {
    void portal.mutateAsync({
      returnUrl: window.location.href,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Plan</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : !subscription ? (
          <p className="text-muted-foreground text-sm">
            No active subscription.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold">
                {subscription.plan.name}
              </h3>
              <Badge variant={statusVariant[subscription.status] ?? "outline"}>
                {subscription.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="text-muted-foreground grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-foreground font-medium">
                  {formatPrice(subscription.plan.price)}
                  <span className="text-muted-foreground text-xs">
                    /{subscription.plan.interval}
                  </span>
                </p>
                <p>Price</p>
              </div>
              <div>
                <p className="text-foreground font-medium">
                  {formatDate(subscription.currentPeriodStart)}
                </p>
                <p>Period Start</p>
              </div>
              <div>
                <p className="text-foreground font-medium">
                  {formatDate(subscription.currentPeriodEnd)}
                </p>
                <p>Period End</p>
              </div>
              {subscription.plan.limits.maxMessages && (
                <div>
                  <p className="text-foreground font-medium">
                    {subscription.plan.limits.maxMessages.toLocaleString()}
                  </p>
                  <p>Messages/mo</p>
                </div>
              )}
            </div>
            {subscription.stripeCustomerId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManage}
                disabled={portal.isPending}
              >
                {portal.isPending ? "Opening..." : "Manage Subscription"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
