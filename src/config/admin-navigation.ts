import {
  Building2,
  LayoutDashboard,
  MapPin,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const adminNavigation: AdminNavigationItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  { label: "Properties", href: "/admin/properties", icon: Building2 },
  { label: "Leads", href: "/admin/leads", icon: Users },
  { label: "Areas", href: "/admin/areas", icon: MapPin },
];
