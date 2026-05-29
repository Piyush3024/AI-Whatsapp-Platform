import { Badge } from "@repo/ui/components/badge";
import type { DocumentStatus } from "@/types/knowledge-base.types";

const statusConfig: Record<
  DocumentStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  UPLOADING: { label: "Uploading", variant: "outline" },
  PROCESSING: { label: "Processing", variant: "outline" },
  EMBEDDING: { label: "Embedding", variant: "outline" },
  READY: { label: "Ready", variant: "default" },
  ARCHIVED: { label: "Archived", variant: "secondary" },
  FAILED: { label: "Failed", variant: "destructive" },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
