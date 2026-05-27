/**
 * Centralized navigation configuration.
 *
 * Purpose:
 * - Sidebar nav items ek jagah define honge
 * - Icon names type-safe honge (IconName from @repo/ui)
 * - Route paths ROUTES constant se aayenge
 * - Sidebar component sirf render karega — logic yahan
 */
import { ROUTES } from "@/constants/routes";
import type { IconName } from "@repo/ui/components/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { href: ROUTES.dashboard, label: "Dashboard", icon: "home" },
  { href: ROUTES.bookings.list, label: "Bookings", icon: "calendar" },
  { href: ROUTES.customers.list, label: "Customers", icon: "users" },
  { href: ROUTES.staff.list, label: "Staff", icon: "users" },
  { href: ROUTES.services.list, label: "Services", icon: "services" },
  { href: ROUTES.analytics, label: "Analytics", icon: "analytics" },
  {
    href: ROUTES.knowledgeBase,
    label: "Knowledge Base",
    icon: "knowledgeBase",
  },
  { href: ROUTES.whatsapp, label: "WhatsApp", icon: "whatsapp" },
];

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: ROUTES.settings.root, label: "Settings", icon: "settings" },
];
