"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icons } from "@repo/ui/components/icons";
import { Button } from "@repo/ui/components/button";
import { Separator } from "@repo/ui/components/separator";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
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

import {
  MAIN_NAV_ITEMS,
  SETTINGS_NAV_GROUP,
  // type NavItem,
} from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { useUIStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import { hasPermission } from "@/lib/rbac";
import type { UserRole } from "@/types/api.types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Simple nav link ───────────────────────────────────────────────────────────

interface NavLinkProps {
  href: string;
  label: string;
  icon: keyof typeof Icons;
  isActive: boolean;
  collapsed: boolean;
  indent?: boolean; // sub-item indentation
  onClick?: () => void;
}

function NavLink({
  href,
  label,
  icon,
  isActive,
  collapsed,
  indent = false,
  onClick,
}: NavLinkProps) {
  const Icon = Icons[icon];

  const linkClass = cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full",
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    collapsed && "justify-center px-2",
    indent && !collapsed && "pl-8",
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

// ── Collapsible settings group ────────────────────────────────────────────────

interface SettingsGroupProps {
  collapsed: boolean;
  role: UserRole;
  pathname: string;
  onClick?: () => void;
}

function SettingsGroup({
  collapsed,
  role,
  pathname,
  onClick,
}: SettingsGroupProps) {
  const { settingsGroupOpen, setSettingsGroupOpen } = useUIStore();

  const visibleItems = SETTINGS_NAV_GROUP.items.filter(
    (item) =>
      !item.requiredPermission || hasPermission(role, item.requiredPermission),
  );

  const isAnyChildActive = visibleItems.some((item) =>
    item.href === ROUTES.settings.root
      ? pathname === item.href
      : pathname.startsWith(item.href),
  );

  // When sidebar is collapsed — show just the settings icon with tooltip
  // clicking navigates directly to /settings (no sub-items visible)
  if (collapsed) {
    return (
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Link
            href={ROUTES.settings.root}
            onClick={onClick}
            className={cn(
              "flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors w-full",
              isAnyChildActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icons.settings className="size-4 shrink-0" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">Settings</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Collapsible
      open={settingsGroupOpen || isAnyChildActive}
      onOpenChange={setSettingsGroupOpen}
    >
      {/* Group trigger */}
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full",
            isAnyChildActive
              ? "text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Icons.settings className="size-4 shrink-0" />
          <span className="flex-1 text-left">Settings</span>
          <Icons.chevronRight
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-200",
              (settingsGroupOpen || isAnyChildActive) && "rotate-90",
            )}
          />
        </button>
      </CollapsibleTrigger>

      {/* Sub-items */}
      <CollapsibleContent className="mt-0.5 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive =
            item.href === ROUTES.settings.root
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={isActive}
              collapsed={false}
              indent
              onClick={onClick}
            />
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── User footer ───────────────────────────────────────────────────────────────

function UserFooter({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuthStore();

  if (collapsed) {
    return (
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div className="flex justify-center py-2">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {user?.name ? getInitials(user.name) : "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-medium">{user?.name ?? "User"}</p>
          <p className="text-xs text-muted-foreground">{user?.role}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md">
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {user?.name ? getInitials(user.name) : "U"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{user?.name ?? "User"}</p>
        <p className="text-xs text-muted-foreground truncate lowercase">
          {user?.role}
        </p>
      </div>
    </div>
  );
}

// ── Desktop Sidebar ───────────────────────────────────────────────────────────

function DesktopSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { user } = useAuthStore();
  const role = (user?.role ?? "STAFF") as UserRole;

  const visibleMain = MAIN_NAV_ITEMS.filter(
    (item) =>
      !item.requiredPermission || hasPermission(role, item.requiredPermission),
  );

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col bg-card border-r transition-all duration-300 ease-in-out h-screen sticky top-0",
        sidebarCollapsed ? "w-15" : "w-64",
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
          className="shrink-0"
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

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {visibleMain.map((item) => {
          const isActive =
            item.href === ROUTES.dashboard
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={isActive}
              collapsed={sidebarCollapsed}
            />
          );
        })}

        {/* Settings collapsible group */}
        <div className="pt-0.5">
          <SettingsGroup
            collapsed={sidebarCollapsed}
            role={role}
            pathname={pathname}
          />
        </div>
      </nav>

      <Separator />

      {/* User footer — replaces old bottom nav */}
      <div className="px-2 py-3">
        <UserFooter collapsed={sidebarCollapsed} />
      </div>
    </aside>
  );
}

// ── Mobile Sidebar ────────────────────────────────────────────────────────────

function MobileSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user } = useAuthStore();
  const role = (user?.role ?? "STAFF") as UserRole;

  const visibleMain = MAIN_NAV_ITEMS.filter(
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

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
          {visibleMain.map((item) => {
            const isActive =
              item.href === ROUTES.dashboard
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={isActive}
                collapsed={false}
                onClick={close}
              />
            );
          })}

          {/* Settings collapsible group */}
          <div className="pt-0.5">
            <SettingsGroup
              collapsed={false}
              role={role}
              pathname={pathname}
              onClick={close}
            />
          </div>
        </nav>

        <Separator />

        {/* User footer */}
        <div className="px-2 py-3">
          <UserFooter collapsed={false} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
}
