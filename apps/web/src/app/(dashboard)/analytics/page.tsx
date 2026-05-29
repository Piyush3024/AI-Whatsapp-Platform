"use client";

import { useState } from "react";
import { DateRangePicker } from "./_components/date-range-picker";
import { OverviewCards } from "./_components/overview-cards";
import { MessagesChart } from "./_components/messages-chart";
import { BookingStats } from "./_components/booking-stats";
import type { AnalyticsDateRange } from "@/types/analytics.types";

function getDefaultRange(): AnalyticsDateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] =
    useState<AnalyticsDateRange>(getDefaultRange);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Business insights and performance
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <OverviewCards />
      <MessagesChart dateRange={dateRange} />
      <BookingStats dateRange={dateRange} />
    </div>
  );
}
