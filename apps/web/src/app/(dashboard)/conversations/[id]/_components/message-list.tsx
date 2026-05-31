"use client";

import { useEffect, useRef } from "react";
import { Skeleton } from "@repo/ui/components/skeleton";
import { MessageBubble } from "./message-bubble";
import { useMessages } from "../../_hooks/use-conversations";
import { GeneralError } from "@/components/shared/error-display";

export function MessageList({ conversationId }: { conversationId: string }) {
  const { data, isPending, isError } = useMessages(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  // Scroll to bottom on first load and when new messages arrive
  useEffect(() => {
    if (data?.items.length && isFirstLoad.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      isFirstLoad.current = false;
    } else if (data?.items.length) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [data?.items.length]);

  if (isError) return <GeneralError minimal />;

  if (isPending) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
          >
            <Skeleton className="h-12 w-48 rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        No messages yet. Start the conversation below.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {data.items.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
