import { Badge } from "@repo/ui/components/badge";
import type { BookingStatus } from "@/types/booking.types";

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

const statusConfig: Record<
  BookingStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  PENDING: { label: "Pending", variant: "outline" },
  CONFIRMED: { label: "Confirmed", variant: "default" },
  COMPLETED: { label: "Completed", variant: "secondary" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  NO_SHOW: { label: "No Show", variant: "outline" },
};

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
