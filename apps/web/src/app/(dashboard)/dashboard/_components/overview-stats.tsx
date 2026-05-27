"use client";

import { StatCard } from "./stat-card";
import { useDashboardStats } from "../hooks/use-dashboard-stats";
import { Skeleton } from "@repo/ui/components/skeleton";

const formatPrice = (paisa: number) => `Rs. ${(paisa / 100).toFixed(2)}`;

export function OverviewStats() {
  const { data, isPending, isError } = useDashboardStats();

  if (isPending) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[110px] rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load stats. Please refresh.
      </p>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Total Bookings"
        value={data.totalBookings}
        icon="calendar"
      />
      <StatCard
        title="Total Customers"
        value={data.totalCustomers}
        icon="users"
      />
      <StatCard
        title="Total Revenue"
        value={formatPrice(data.totalRevenuePaisa)}
        icon="analytics"
      />
      <StatCard
        title="Total Messages"
        value={data.totalMessages}
        icon="whatsapp"
      />
      <StatCard title="Active Staff" value={data.activeStaff} icon="users" />
      <StatCard
        title="Total Locations"
        value={data.totalLocations}
        icon="home"
      />
    </div>
  );
}
