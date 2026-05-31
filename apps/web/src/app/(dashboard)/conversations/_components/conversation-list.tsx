"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { formatDistanceToNow } from "date-fns";
import { Icons } from "@repo/ui/components/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { ConversationStatusBadge } from "./conversation-status-badge";
import { useConversations } from "../_hooks/use-conversations";
import { GeneralError } from "@/components/shared/error-display";
import { ROUTES } from "@/constants/routes";
import type { ConversationStatus } from "@/types/conversation.types";

export function ConversationList() {
  const router = useRouter();
  const [status, setStatus] = useState<ConversationStatus | "ALL">("ALL");

  const { data, isPending, isError } = useConversations({
    status: status === "ALL" ? undefined : status,
    limit: 30,
  });

  if (isError) return <GeneralError minimal />;

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-4 border-b space-y-3">
        <h1 className="text-lg font-semibold">Conversations</h1>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as ConversationStatus | "ALL")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Conversations</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="HUMAN_HANDOFF">Needs Attention</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y">
        {isPending ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-48" />
            </div>
          ))
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6">
            <Icons.messages className="size-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No conversations found
            </p>
          </div>
        ) : (
          data.items.map((conv) => (
            <button
              key={conv.id}
              onClick={() => router.push(ROUTES.conversations.detail(conv.id))}
              className={cn(
                "w-full text-left p-4 hover:bg-muted/50 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {conv.customer.name ?? conv.customer.phone}
                    </span>
                    {conv.status !== "OPEN" && (
                      <ConversationStatusBadge status={conv.status} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.lastMessage ? (
                      <>
                        {conv.lastMessage.direction === "OUTBOUND" && (
                          <span className="mr-1">You:</span>
                        )}
                        {conv.lastMessage.content ?? "📎 Media"}
                      </>
                    ) : (
                      "No messages yet"
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">
                    {conv.lastMessage
                      ? formatDistanceToNow(
                          new Date(conv.lastMessage.createdAt),
                          { addSuffix: true },
                        )
                      : formatDistanceToNow(new Date(conv.updatedAt), {
                          addSuffix: true,
                        })}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
