"use client";

import Link from "next/link";
import { Icons } from "@repo/ui/components/icons";
import { Button } from "@repo/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Skeleton } from "@repo/ui/components/skeleton";
import { ConversationStatusBadge } from "../../_components/conversation-status-badge";
import {
  useConversation,
  useUpdateConversationStatus,
} from "../../_hooks/use-conversations";
import { ROUTES } from "@/constants/routes";
import type { ConversationStatus } from "@/types/conversation.types";

export function ConversationSidebar({
  conversationId,
}: {
  conversationId: string;
}) {
  const { data: conversation, isPending } = useConversation(conversationId);
  const { mutate: updateStatus, isPending: isUpdating } =
    useUpdateConversationStatus(conversationId);

  if (isPending) {
    return (
      <div className="w-72 border-l p-4 space-y-4 shrink-0">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (!conversation) return null;

  return (
    <div className="w-72 border-l flex flex-col shrink-0 overflow-y-auto">
      {/* Customer info */}
      <div className="p-4 border-b">
        <p className="text-xs text-muted-foreground uppercase font-medium mb-3">
          Customer
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Icons.user className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {conversation.customer.name ?? "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground">
                {conversation.customer.phone}
              </p>
            </div>
          </div>
          <Link href={ROUTES.customers.detail(conversation.customer.id)}>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-1 cursor-pointer"
            >
              <Icons.externalLink className="size-3.5 mr-2" />
              View Customer
            </Button>
          </Link>
        </div>
      </div>

      {/* Conversation status */}
      <div className="p-4 border-b">
        <p className="text-xs text-muted-foreground uppercase font-medium mb-3">
          Status
        </p>
        <div className="space-y-2">
          <ConversationStatusBadge status={conversation.status} />
          <Select
            value={conversation.status}
            onValueChange={(v) => updateStatus(v as ConversationStatus)}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-full mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="HUMAN_HANDOFF">Needs Attention</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI State */}
      <div className="p-4 border-b">
        <p className="text-xs text-muted-foreground uppercase font-medium mb-2">
          AI State
        </p>
        <span className="text-xs bg-muted px-2 py-1 rounded-full">
          {conversation.state}
        </span>
      </div>

      {/* Assigned staff */}
      {conversation.assignedStaff && (
        <div className="p-4">
          <p className="text-xs text-muted-foreground uppercase font-medium mb-2">
            Assigned To
          </p>
          <p className="text-sm">{conversation.assignedStaff.name}</p>
        </div>
      )}
    </div>
  );
}
