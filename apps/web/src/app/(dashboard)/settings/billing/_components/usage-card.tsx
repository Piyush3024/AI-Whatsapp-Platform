"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { useBillingUsage } from "../hooks/use-billing";
import type { UsageStatus } from "@/types/billing.types";

function UsageBar({ status, label }: { status: UsageStatus; label: string }) {
  const isUnlimited = status.limit === null;
  const percentage = isUnlimited
    ? 0
    : Math.min((status.used / status.limit!) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span
          className={cn(
            "text-muted-foreground",
            status.isExceeded && "text-destructive font-medium",
          )}
        >
          {isUnlimited ? (
            <span>{status.used.toLocaleString()} / Unlimited</span>
          ) : (
            <span>
              {status.used.toLocaleString()} / {status.limit!.toLocaleString()}
            </span>
          )}
        </span>
      </div>

      {/* Progress bar — only show when there is a limit */}
      {!isUnlimited && (
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              percentage >= 100
                ? "bg-destructive"
                : percentage >= 80
                  ? "bg-amber-500"
                  : "bg-primary",
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {status.isExceeded && (
        <p className="text-xs text-destructive">
          Limit reached — upgrade your plan to continue.
        </p>
      )}
    </div>
  );
}

export function UsageCard() {
  const { data: usage, isLoading } = useBillingUsage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Usage</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : !usage ? (
          <p className="text-sm text-muted-foreground">
            Usage data unavailable.
          </p>
        ) : (
          <div className="space-y-6">
            <UsageBar status={usage.maxMessages} label="Daily Messages" />
            <UsageBar status={usage.maxStaff} label="Staff Members" />
            <UsageBar status={usage.maxLocations} label="Locations" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
