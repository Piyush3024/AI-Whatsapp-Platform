"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { formatDistanceToNow } from "date-fns";
import { Icons } from "@repo/ui/components/icons";
import { Button } from "@repo/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import {
  useUnreadCount,
  useNotifications,
  useMarkRead,
  useMarkAllRead,
} from "@/hooks/use-notifications";
import { ROUTES } from "@/constants/routes";

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: unreadData } = useUnreadCount();
  const { data: notificationsData, isPending } = useNotifications();
  const { mutate: markRead } = useMarkRead();
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllRead();

  const unreadCount = unreadData?.count ?? 0;
  const notifications = notificationsData?.items ?? [];

  const handleNotificationClick = (id: string, conversationId?: string) => {
    markRead(id);
    if (conversationId) {
      router.push(ROUTES.conversations.detail(conversationId));
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative cursor-pointer"
          aria-label="Notifications"
        >
          <Icons.notifications className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs cursor-pointer"
              onClick={() => markAllRead()}
              disabled={isMarkingAll}
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="h-80">
          {isPending ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20 gap-1">
              <Icons.notifications className="size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() =>
                    handleNotificationClick(
                      notification.id,
                      notification.metadata.conversationId,
                    )
                  }
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    !notification.readAt && "bg-primary/5",
                  )}
                >
                  <div className="flex items-start gap-2">
                    {/* Unread dot */}
                    <div className="mt-1.5 shrink-0">
                      {!notification.readAt ? (
                        <div className="size-2 rounded-full bg-primary" />
                      ) : (
                        <div className="size-2 rounded-full bg-transparent" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.body}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
