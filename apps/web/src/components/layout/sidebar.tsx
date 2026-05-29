"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icons } from "@repo/ui/components/icons";
import { Button } from "@repo/ui/components/button";
import { Separator } from "@repo/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { MAIN_NAV_ITEMS, BOTTOM_NAV_ITEMS } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { useUIStore } from "@/stores/ui.store";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-card border-r transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <Link href={ROUTES.dashboard} className="flex items-center gap-2">
            <Icons.whatsapp className="size-6 text-primary" />
            <span className="font-semibold text-sm">WA AI Platform</span>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <Icons.close className="size-4" />
          </Button>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {MAIN_NAV_ITEMS.map(({ href, label, icon }) => {
            const Icon = Icons[icon];
            const isActive =
              href === ROUTES.dashboard
                ? pathname === href
                : pathname.startsWith(href);

            return (
              <Tooltip key={href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {label}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="lg:hidden">
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <Separator />

        {/* Bottom Nav */}
        <div className="px-2 py-4 space-y-1">
          {BOTTOM_NAV_ITEMS.map(({ href, label, icon }) => {
            const Icon = Icons[icon];
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
