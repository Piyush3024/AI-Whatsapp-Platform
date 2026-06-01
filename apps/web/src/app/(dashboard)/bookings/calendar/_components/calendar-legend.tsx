const LEGEND_ITEMS = [
  { status: "PENDING", color: "#f59e0b", label: "Pending" },
  { status: "CONFIRMED", color: "#10b981", label: "Confirmed" },
  { status: "COMPLETED", color: "#6366f1", label: "Completed" },
  { status: "CANCELLED", color: "#ef4444", label: "Cancelled" },
  { status: "NO_SHOW", color: "#6b7280", label: "No Show" },
];

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.status} className="flex items-center gap-1.5">
          <div
            className="size-3 rounded-sm shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
