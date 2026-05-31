import { format } from "date-fns";
import { cn } from "@repo/ui/lib/utils";
import { Icons } from "@repo/ui/components/icons";
import type { MessageItem } from "@/types/conversation.types";

const statusIcon = {
  QUEUED: null,
  SENT: Icons.check,
  DELIVERED: Icons.checkCheck,
  READ: Icons.checkCheck,
  FAILED: Icons.warning,
};

export function MessageBubble({ message }: { message: MessageItem }) {
  const isOutbound = message.direction === "OUTBOUND";
  const StatusIcon = statusIcon[message.status];

  return (
    <div
      className={cn(
        "flex w-full",
        isOutbound ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 space-y-1",
          isOutbound
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm",
        )}
      >
        {/* Content */}
        {message.content ? (
          <p className="text-sm whitespace-pre-wrap wrap-break-word">
            {message.content}
          </p>
        ) : (
          <p className="text-sm italic opacity-70">Media message</p>
        )}

        {/* Timestamp + status */}
        <div
          className={cn(
            "flex items-center gap-1",
            isOutbound ? "justify-end" : "justify-start",
          )}
        >
          <span className="text-[10px] opacity-70">
            {format(new Date(message.createdAt), "HH:mm")}
          </span>
          {isOutbound && StatusIcon && (
            <StatusIcon
              className={cn(
                "size-3",
                message.status === "READ" ? "text-blue-400" : "opacity-70",
              )}
            />
          )}
          {isOutbound && message.status === "FAILED" && (
            <Icons.warning className="size-3 text-destructive" />
          )}
        </div>
      </div>
    </div>
  );
}
