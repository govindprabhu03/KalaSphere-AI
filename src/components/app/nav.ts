import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  GraduationCap,
  Music2,
  LineChart,
  Ticket,
  ScanLine,
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
  {
    label: "Check-in",
    href: "/dashboard/scan",
    icon: ScanLine,
    roles: ["admin", "faculty", "super_admin"],
  },
  { label: "My tickets", href: "/dashboard/tickets", icon: Ticket, roles: "all" },
  {
    label: "Members",
    href: "/dashboard/members",
    icon: Users,
    roles: ["admin", "super_admin"],
  },
];

export function navForRole(role: AppRole): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles === "all" || i.roles.includes(role));
}
