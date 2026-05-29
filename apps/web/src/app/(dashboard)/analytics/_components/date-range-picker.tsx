"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import type { AnalyticsDateRange } from "@/types/analytics.types";

interface DateRangePickerProps {
  value: AnalyticsDateRange;
  onChange: (range: AnalyticsDateRange) => void;
}

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  function applyPreset(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    onChange({ ...value, from: toYMD(from), to: toYMD(to) });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            className="h-8 w-36 text-sm"
            value={value.from ?? ""}
            onChange={(e) =>
              onChange({ ...value, from: e.target.value || undefined })
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            className="h-8 w-36 text-sm"
            value={value.to ?? ""}
            onChange={(e) =>
              onChange({ ...value, to: e.target.value || undefined })
            }
          />
        </div>
      </div>
      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <Button
            key={p.days}
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => applyPreset(p.days)}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
