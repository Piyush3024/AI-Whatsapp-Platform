"use client";

import { useState } from "react";
import { DateRangePicker } from "./date-range-picker";
import { OverviewCards } from "./overview-cards";
import { MessagesChart } from "./messages-chart";
import { BookingStats } from "./booking-stats";
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

export function AnalyticsPageContent() {
  const [dateRange, setDateRange] =
    useState<AnalyticsDateRange>(getDefaultRange);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your business performance metrics
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
