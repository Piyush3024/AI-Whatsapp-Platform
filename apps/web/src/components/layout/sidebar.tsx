// src/components/layout/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icons } from "@repo/ui/components/icons";
import { Button } from "@repo/ui/components/button";
import { Separator } from "@repo/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@repo/ui/components/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";

import { MAIN_NAV_ITEMS, BOTTOM_NAV_ITEMS } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { useUIStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import { hasPermission } from "@/lib/rbac";
import type { UserRole } from "@/types/api.types";

// ─── Nav Link (shared between desktop + mobile) ───────────────────────────────

interface NavLinkProps {
  href: string;
  label: string;
  icon: keyof typeof Icons;
  isActive: boolean;
  collapsed: boolean; // desktop mini mode
  onClick?: () => void;
}

function NavLink({
  href,
  label,
  icon,
  isActive,
  collapsed,
  onClick,
}: NavLinkProps) {
  const Icon = Icons[icon];

  const linkClass = cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    collapsed && "justify-center px-2",
  );

  return (
    <Tooltip delayDuration={collapsed ? 100 : 9999}>
      <TooltipTrigger asChild>
        <Link href={href} onClick={onClick} className={linkClass}>
          <Icon className="size-4 shrink-0" />
          {!collapsed && <span>{label}</span>}
        </Link>
      </TooltipTrigger>
      {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
    </Tooltip>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────

function DesktopSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { user } = useAuthStore();
  const role = (user?.role ?? "STAFF") as UserRole;

  const visibleMain = MAIN_NAV_ITEMS.filter(
    (item) =>
      !item.requiredPermission || hasPermission(role, item.requiredPermission),
  );
  const visibleBottom = BOTTOM_NAV_ITEMS.filter(
    (item) =>
      !item.requiredPermission || hasPermission(role, item.requiredPermission),
  );

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col bg-card border-r transition-all duration-300 ease-in-out h-screen sticky top-0",
        sidebarCollapsed ? "w-[60px]" : "w-64",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex h-16 items-center border-b shrink-0",
          sidebarCollapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        {!sidebarCollapsed && (
          <Link href={ROUTES.dashboard} className="flex items-center gap-2">
            <Icons.whatsapp className="size-6 text-primary shrink-0" />
            <span className="font-semibold text-sm truncate">
              WA AI Platform
            </span>
          </Link>
        )}
        {sidebarCollapsed && (
          <Link href={ROUTES.dashboard}>
            <Icons.whatsapp className="size-6 text-primary" />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebarCollapsed}
          className={cn("shrink-0", sidebarCollapsed && "mt-0")}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icons.chevronLeft
            className={cn(
              "size-4 transition-transform duration-300",
              sidebarCollapsed && "rotate-180",
            )}
          />
        </Button>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {visibleMain.map(({ href, label, icon }) => {
          const isActive =
            href === ROUTES.dashboard
              ? pathname === href
              : pathname.startsWith(href);
          return (
            <NavLink
              key={href}
              href={href}
              label={label}
              icon={icon}
              isActive={isActive}
              collapsed={sidebarCollapsed}
            />
          );
        })}
      </nav>

      <Separator />

      {/* Bottom Nav */}
      <div className="px-2 py-4 space-y-1">
        {visibleBottom.map(({ href, label, icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <NavLink
              key={href}
              href={href}
              label={label}
              icon={icon}
              isActive={isActive}
              collapsed={sidebarCollapsed}
            />
          );
        })}
      </div>
    </aside>
  );
}

// ─── Mobile Sidebar (Sheet) ───────────────────────────────────────────────────

function MobileSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user } = useAuthStore();
  const role = (user?.role ?? "STAFF") as UserRole;

  const visibleMain = MAIN_NAV_ITEMS.filter(
    (item) =>
      !item.requiredPermission || hasPermission(role, item.requiredPermission),
  );
  const visibleBottom = BOTTOM_NAV_ITEMS.filter(
    (item) =>
      !item.requiredPermission || hasPermission(role, item.requiredPermission),
  );

  const close = () => setSidebarOpen(false);

  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent side="left" className="w-64 p-0 flex flex-col">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Mobile navigation menu for WA AI Platform
        </SheetDescription>
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b shrink-0">
          <Link
            href={ROUTES.dashboard}
            className="flex items-center gap-2"
            onClick={close}
          >
            <Icons.whatsapp className="size-6 text-primary" />
            <span className="font-semibold text-sm">WA AI Platform</span>
          </Link>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {visibleMain.map(({ href, label, icon }) => {
            const isActive =
              href === ROUTES.dashboard
                ? pathname === href
                : pathname.startsWith(href);
            return (
              <NavLink
                key={href}
                href={href}
                label={label}
                icon={icon}
                isActive={isActive}
                collapsed={false}
                onClick={close}
              />
            );
          })}
        </nav>

        <Separator />

        {/* Bottom Nav */}
        <div className="px-2 py-4 space-y-1">
          {visibleBottom.map(({ href, label, icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <NavLink
                key={href}
                href={href}
                label={label}
                icon={icon}
                isActive={isActive}
                collapsed={false}
                onClick={close}
              />
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
}
