import { ROUTES } from "@/constants/routes";
import type { IconName } from "@repo/ui/components/icons";
import type { Permission } from "@/lib/rbac";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  requiredPermission?: Permission;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    href: ROUTES.dashboard,
    label: "Dashboard",
    icon: "home",
    // no permission = all roles see this
  },
  {
    href: ROUTES.bookings.list,
    label: "Bookings",
    icon: "calendar",
    requiredPermission: "bookings:view",
  },
  {
    href: ROUTES.conversations.list,
    label: "Conversations",
    icon: "messages",
    requiredPermission: "conversations:view",
  },
  {
    href: ROUTES.customers.list,
    label: "Customers",
    icon: "users",
    requiredPermission: "customers:view",
  },
  {
    href: ROUTES.staff.list,
    label: "Staff",
    icon: "users",
    requiredPermission: "staff:manage",
  },
  {
    href: ROUTES.services.list,
    label: "Services",
    icon: "services",
    requiredPermission: "services:manage",
  },
  {
    href: ROUTES.analytics,
    label: "Analytics",
    icon: "analytics",
    requiredPermission: "analytics:view",
  },
  {
    href: ROUTES.knowledgeBase,
    label: "Knowledge Base",
    icon: "knowledgeBase",
    requiredPermission: "knowledge-base:manage",
  },
  {
    href: ROUTES.whatsapp,
    label: "WhatsApp",
    icon: "whatsapp",
    requiredPermission: "whatsapp:manage",
  },
];

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  {
    href: ROUTES.settings.root,
    label: "Settings",
    icon: "settings",
    requiredPermission: "settings:manage",
  },
];
