import { Badge } from "@repo/ui/components/badge";

const statusConfig = {
  active: { label: "Active", variant: "default" as const },
  inactive: { label: "Inactive", variant: "secondary" as const },
};

export function StaffStatusBadge({ isActive }: { isActive: boolean }) {
  const config = statusConfig[isActive ? "active" : "inactive"];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
