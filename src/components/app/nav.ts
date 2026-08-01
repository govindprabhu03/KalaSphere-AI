import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  GraduationCap,
  Music2,
  LineChart,
  Building2,
  CalendarCheck,
  UtensilsCrossed,
  ChefHat,
  ShoppingBag,
  Newspaper,
  Megaphone,
  Images,
  Palette,
  Sparkles,
  Ticket,
  ScanLine,
  Award,
  NotebookPen,
  Paintbrush2,
} from "lucide-react";
import type { AppRole } from "@/lib/auth/roles";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: readonly AppRole[] | "all";
};

/** Sidebar navigation. Grows as later phases add modules. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: "all" },
  { label: "AI Assistant", href: "/dashboard/assistant", icon: Sparkles, roles: "all" },
  {
    label: "Events",
    href: "/dashboard/events",
    icon: CalendarDays,
    roles: ["admin", "super_admin"],
  },
  {
    label: "Workshops",
    href: "/dashboard/workshops",
    icon: GraduationCap,
    roles: ["admin", "super_admin"],
  },
  {
    label: "Classes",
    href: "/dashboard/classes",
    icon: Music2,
    roles: ["admin", "faculty", "super_admin"],
  },
  { label: "Growth", href: "/dashboard/growth", icon: LineChart, roles: "all" },
  { label: "Assignments", href: "/dashboard/assignments", icon: NotebookPen, roles: "all" },
  {
    label: "Venues",
    href: "/dashboard/venues",
    icon: Building2,
    roles: ["admin", "super_admin"],
  },
  { label: "Bookings", href: "/dashboard/bookings", icon: CalendarCheck, roles: "all" },
  {
    label: "Canteen",
    href: "/dashboard/canteen",
    icon: UtensilsCrossed,
    roles: ["admin", "super_admin"],
  },
  {
    label: "Kitchen",
    href: "/dashboard/kitchen",
    icon: ChefHat,
    roles: ["admin", "faculty", "super_admin"],
  },
  { label: "My orders", href: "/dashboard/orders", icon: ShoppingBag, roles: "all" },
  {
    label: "Check-in",
    href: "/dashboard/scan",
    icon: ScanLine,
    roles: ["admin", "faculty", "super_admin"],
  },
  { label: "My tickets", href: "/dashboard/tickets", icon: Ticket, roles: "all" },
  {
    label: "Certificates",
    href: "/dashboard/certificates",
    icon: Award,
    roles: "all",
  },
  {
    label: "News",
    href: "/dashboard/news",
    icon: Newspaper,
    roles: ["admin", "super_admin"],
  },
  {
    label: "Announcements",
    href: "/dashboard/announcements",
    icon: Megaphone,
    roles: ["admin", "super_admin"],
  },
  {
    label: "Gallery",
    href: "/dashboard/gallery",
    icon: Images,
    roles: ["admin", "super_admin"],
  },
  { label: "Community", href: "/dashboard/community", icon: Palette, roles: "all" },
  {
    label: "Members",
    href: "/dashboard/members",
    icon: Users,
    roles: ["admin", "super_admin"],
  },
  {
    label: "Branding",
    href: "/dashboard/branding",
    icon: Paintbrush2,
    roles: ["admin", "super_admin"],
  },
];

export function navForRole(role: AppRole): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles === "all" || i.roles.includes(role));
}
