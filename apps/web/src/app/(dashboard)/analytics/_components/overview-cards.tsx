"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Icons } from "@repo/ui/components/icons";
import { useAnalyticsOverview } from "../hooks/use-analytics";
import { formatPrice } from "@/lib/utils";

const STAT_CONFIG = [
  {
    key: "totalBookings",
    label: "Total Bookings",
    icon: "calendar" as const,
    isPrice: false as const,
  },
  {
    key: "totalCustomers",
    label: "Total Customers",
    icon: "users" as const,
    isPrice: false as const,
  },
  {
    key: "totalMessages",
    label: "Total Messages",
    icon: "message" as const,
    isPrice: false as const,
  },
  {
    key: "activeStaff",
    label: "Active Staff",
    icon: "user" as const,
    isPrice: false as const,
  },
  {
    key: "totalLocations",
    label: "Locations",
    icon: "mapPin" as const,
    isPrice: false as const,
  },
  {
    key: "totalRevenuePaisa",
    label: "Total Revenue",
    icon: "currencyDollar" as const,
    isPrice: true as const,
  },
] as const;

export function OverviewCards() {
  const { data, isLoading } = useAnalyticsOverview();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {STAT_CONFIG.map(({ key, label, icon, isPrice }) => {
        const Icon = Icons[icon];
        const raw = data?.[key as keyof typeof data] ?? 0;
        const value = isPrice
          ? formatPrice(raw as number)
          : (raw as number).toLocaleString();

        return (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              {Icon && <Icon className="size-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <p className="text-2xl font-bold">{value}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
