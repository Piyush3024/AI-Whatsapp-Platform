import { Badge } from "@repo/ui/components/badge";
import type { CustomerOptInStatus } from "@/types/customer.types";

interface CustomerOptInBadgeProps {
  status: CustomerOptInStatus;
}

const statusConfig: Record<
  CustomerOptInStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  OPTED_IN: { label: "Opted In", variant: "default" },
  OPTED_OUT: { label: "Opted Out", variant: "destructive" },
  PENDING: { label: "Pending", variant: "outline" },
};

export function CustomerOptInBadge({ status }: CustomerOptInBadgeProps) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
