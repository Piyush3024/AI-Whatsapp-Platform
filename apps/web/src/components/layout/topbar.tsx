"use client";

import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Icons } from "@repo/ui/components/icons";
import { useAuthStore } from "@/stores/auth.store";
import { useLogout } from "@/app/(auth)/logout/hooks/use-logout";
import { useUIStore } from "@/stores/ui.store";
import { useTheme } from "next-themes";
import { NotificationBell } from "@/components/layout/notification-bell";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const { mutate: logout, isPending } = useLogout();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={toggleSidebar}
      >
        <Icons.menu className="size-4" />
      </Button>

      <div className="hidden lg:block" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationBell />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Icons.sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Icons.moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative size-9 rounded-full p-0"
            >
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user?.name ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name ?? "User"}</p>
                <p className="text-muted-foreground text-xs truncate">
                  {user?.email ?? ""}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings" className="cursor-pointer">
                <Icons.settings className="mr-2 size-4" />
                Settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              disabled={isPending}
              onClick={() => logout()}
            >
              <Icons.logout className="mr-2 size-4" />
              {isPending ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
