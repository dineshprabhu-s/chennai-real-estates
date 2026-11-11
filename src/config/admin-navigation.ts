import {
  Building2,
  ContactRound,
  LayoutDashboard,
  MapPin,
  PlusCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Paths that must not mark this item active. */
  excludePrefixes?: string[];
}

export const adminNavigation: AdminNavigationItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Properties",
    href: "/admin/properties",
    icon: Building2,
    excludePrefixes: ["/admin/properties/new"],
  },
  {
    label: "Add Property",
    href: "/admin/properties/new",
    icon: PlusCircle,
    exact: true,
  },
  { label: "Leads / Enquiries", href: "/admin/leads", icon: Users },
  { label: "Customers", href: "/admin/customers", icon: ContactRound },
  { label: "Areas", href: "/admin/areas", icon: MapPin },
];
