"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useMessageStats } from "../hooks/use-analytics";
import type {
  AnalyticsDateRange,
  MessageStatRow,
} from "@/types/analytics.types";

interface MessagesChartProps {
  dateRange: AnalyticsDateRange;
}

interface ChartRow {
  date: string;
  Inbound: number;
  Outbound: number;
}

function transformData(rows: MessageStatRow[]): ChartRow[] {
  const map = new Map<string, ChartRow>();
  for (const row of rows) {
    const d = row.date.slice(0, 10);
    if (!map.has(d)) map.set(d, { date: d, Inbound: 0, Outbound: 0 });
    const entry = map.get(d)!;
    if (row.direction === "INBOUND") entry.Inbound = row.count;
    else entry.Outbound = row.count;
  }
  return Array.from(map.values());
}

export function MessagesChart({ dateRange }: MessagesChartProps) {
  const { data, isLoading } = useMessageStats(dateRange);
  const chartData = data ? transformData(data) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Messages — Inbound vs Outbound
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : chartData.length === 0 ? (
          <p className="text-muted-foreground py-16 text-center text-sm">
            No message data for this period.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="Inbound"
                fill="hsl(var(--chart-1, 220 70% 50%))"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Outbound"
                fill="hsl(var(--chart-2, 160 60% 45%))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
