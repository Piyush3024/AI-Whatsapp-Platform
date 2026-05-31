"use client";

import { useState, useRef } from "react";
import { Icons } from "@repo/ui/components/icons";
import { Button } from "@repo/ui/components/button";
import { Textarea } from "@repo/ui/components/textarea";
import { useSendMessage } from "../../_hooks/use-conversations";

export function MessageInput({ conversationId }: { conversationId: string }) {
  const [content, setContent] = useState("");
  const { mutate: send, isPending } = useSendMessage(conversationId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || isPending) return;
    send(trimmed, {
      onSuccess: () => {
        setContent("");
        textareaRef.current?.focus();
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t p-4">
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          className="min-h-11 max-h-32 resize-none"
          rows={1}
          disabled={isPending}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!content.trim() || isPending}
          className="shrink-0 cursor-pointer"
        >
          {isPending ? (
            <Icons.spinner className="size-4 animate-spin" />
          ) : (
            <Icons.send className="size-4" />
          )}
          <span className="sr-only">Send message</span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
