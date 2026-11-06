import type { Metadata } from "next";

import { AdminHeader } from "@/components/layout/admin-header";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-muted/30">
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to admin content
      </a>
      <AdminSidebar />
      <div className="flex min-h-dvh flex-col lg:pl-80">
        <AdminHeader />
        <main
          id="admin-main-content"
          className="flex-1 px-4 py-8 sm:px-6 lg:px-8"
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <footer className="border-t border-border px-4 py-5 text-xs text-muted-foreground sm:px-6 lg:px-8">
          {siteConfig.name} · Admin foundation build · Authentication and data
          storage pending
        </footer>
      </div>
    </div>
  );
}
