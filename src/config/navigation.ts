export interface NavigationItem {
  label: string;
  href: string;
  exact?: boolean;
}

export const publicNavigation: NavigationItem[] = [
  { label: "Home", href: "/", exact: true },
  { label: "Properties", href: "/properties" },
  { label: "Areas", href: "/areas" },
  { label: "Contact", href: "/contact" },
];
