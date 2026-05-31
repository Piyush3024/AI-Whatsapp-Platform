"use client";

import { use } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Icons } from "@repo/ui/components/icons";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { NotFoundError } from "@/components/shared/error-display";
import { MessageList } from "./_components/message-list";
import { MessageInput } from "./_components/message-input";
import { ConversationSidebar } from "./_components/conversation-sidebar";
import { ConversationStatusBadge } from "../_components/conversation-status-badge";
import { useConversation } from "../_hooks/use-conversations";
import { ROUTES } from "@/constants/routes";

export default function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: conversation, isPending, isError } = useConversation(id);

  if (isError || (!isPending && !conversation)) {
    return <NotFoundError />;
  }

  return (
    <div className="h-full -m-4 lg:-m-6 flex">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Chat header */}
        <div className="border-b px-4 py-3 flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(ROUTES.conversations.list)}
            className="cursor-pointer"
          >
            <Icons.arrowLeft className="size-4" />
          </Button>

          {isPending ? (
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="size-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Icons.user className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {conversation?.customer.name ?? conversation?.customer.phone}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {conversation?.customer.phone}
                </p>
              </div>
              {conversation && (
                <ConversationStatusBadge status={conversation.status} />
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <MessageList conversationId={id} />

        {/* Input */}
        <MessageInput conversationId={id} />
      </div>

      {/* Sidebar */}
      <ConversationSidebar conversationId={id} />
    </div>
  );
}
