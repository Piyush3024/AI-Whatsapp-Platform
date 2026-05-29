import { Badge } from "@repo/ui/components/badge";

export function ServiceStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? "default" : "secondary"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}
