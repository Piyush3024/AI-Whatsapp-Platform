import { Icons } from "@repo/ui/components/icons";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Icons.home },
  { href: "/bookings", label: "Bookings", icon: Icons.calendar },
  { href: "/customers", label: "Customers", icon: Icons.users },
  { href: "/staff", label: "Staff", icon: Icons.users },
  { href: "/services", label: "Services", icon: Icons.services },
  { href: "/analytics", label: "Analytics", icon: Icons.analytics },
  {
    href: "/knowledge-base",
    label: "Knowledge Base",
    icon: Icons.knowledgeBase,
  },
  { href: "/whatsapp", label: "WhatsApp", icon: Icons.whatsapp },
] as const;

export const bottomNavItems = [
  { href: "/settings", label: "Settings", icon: Icons.settings },
] as const;
