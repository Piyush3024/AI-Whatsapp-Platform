"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Input } from "@repo/ui/components/input";
import { Button } from "@repo/ui/components/button";
import { Icons } from "@repo/ui/components/icons";
import type { BookingQuery, BookingStatus } from "@/types/booking.types";

interface BookingFiltersProps {
  filters: BookingQuery;
  onFilterChange: (filters: BookingQuery) => void;
  onReset: () => void;
}

const STATUS_OPTIONS: { label: string; value: BookingStatus }[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "No Show", value: "NO_SHOW" },
];

export function BookingFilters({
  filters,
  onFilterChange,
  onReset,
}: BookingFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status filter */}
      <Select
        value={filters.status ?? "ALL"}
        onValueChange={(value) =>
          onFilterChange({
            ...filters,
            status: value === "ALL" ? undefined : (value as BookingStatus),
            page: 1,
          })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date from */}
      <Input
        type="date"
        className="w-[160px]"
        value={filters.dateFrom ?? ""}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            dateFrom: e.target.value || undefined,
            page: 1,
          })
        }
      />

      {/* Date to */}
      <Input
        type="date"
        className="w-[160px]"
        value={filters.dateTo ?? ""}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            dateTo: e.target.value || undefined,
            page: 1,
          })
        }
      />

      {/* Reset */}
      <Button variant="outline" size="sm" onClick={onReset}>
        <Icons.refresh className="size-4 mr-2" />
        Reset
      </Button>
    </div>
  );
}
