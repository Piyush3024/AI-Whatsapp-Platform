import { cn } from "@repo/ui/lib/utils";
import type { ConversationStatus } from "@/types/conversation.types";

const statusConfig: Record<
  ConversationStatus,
  { label: string; className: string }
> = {
  OPEN: {
    label: "Open",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  HUMAN_HANDOFF: {
    label: "Needs Attention",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  CLOSED: {
    label: "Closed",
    className: "bg-muted text-muted-foreground",
  },
};

export function ConversationStatusBadge({
  status,
}: {
  status: ConversationStatus;
}) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
