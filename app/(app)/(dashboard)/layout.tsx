import type { ReactNode } from "react";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { MobileHeader } from "@/components/mobile-header";
import { SidebarNav } from "@/components/sidebar-nav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ConvexClientProvider>
      <div className="flex h-dvh w-full flex-col md:flex-row">
        <aside className="hidden md:flex md:w-52 md:flex-col md:border-r md:bg-muted/30">
          <SidebarNav />
        </aside>
        <MobileHeader />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </ConvexClientProvider>
  );
}
