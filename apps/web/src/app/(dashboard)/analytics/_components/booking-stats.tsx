"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useBookingStats } from "../hooks/use-analytics";
import { formatPrice } from "@/lib/utils";
import type { AnalyticsDateRange } from "@/types/analytics.types";

interface BookingStatsProps {
  dateRange: AnalyticsDateRange;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "hsl(45 93% 58%)",
  CONFIRMED: "hsl(220 70% 50%)",
  COMPLETED: "hsl(160 60% 45%)",
  CANCELLED: "hsl(0 72% 51%)",
  NO_SHOW: "hsl(280 60% 55%)",
};

export function BookingStats({ dateRange }: BookingStatsProps) {
  const { data, isLoading } = useBookingStats(dateRange);

  const pieData =
    data?.byStatus.map((s) => ({
      name: s.status,
      value: s.count,
    })) ?? [];

  const barData =
    data?.byLocation.map((l) => ({
      name: l.locationName,
      Bookings: l.count,
      Revenue: l.totalAmountPaisa / 100,
    })) ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Pie — by status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bookings by Status</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : pieData.length === 0 ? (
            <p className="text-muted-foreground py-16 text-center text-sm">
              No booking data.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] ?? "hsl(210 40% 60%)"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              {data && (
                <p className="text-muted-foreground mt-2 text-center text-sm">
                  Total Revenue:{" "}
                  <span className="text-foreground font-semibold">
                    {formatPrice(data.totalRevenuePaisa)}
                  </span>
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bar — by location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bookings by Location</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : barData.length === 0 ? (
            <p className="text-muted-foreground py-16 text-center text-sm">
              No location data.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={barData}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val, name) =>
                    name === "Revenue" ? `Rs. ${val}` : val
                  }
                />
                <Legend />
                <Bar
                  dataKey="Bookings"
                  fill="hsl(220 70% 50%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
