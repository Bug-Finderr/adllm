import { LayoutDashboardIcon, SettingsIcon, ZapIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { UserMenu } from "@/components/UserMenu";
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ConvexClientProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </ConvexClientProvider>
  );
}

function Sidebar() {
  return (
    <aside className="flex w-52 flex-col border-r bg-muted/30">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <ZapIcon className="h-5 w-5 text-primary" />
        <span className="font-bold tracking-tight">AdLLM</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        <NavLink
          href="/dashboard"
          icon={<LayoutDashboardIcon className="h-4 w-4" />}
        >
          Dashboard
        </NavLink>
        <NavLink
          href="/dashboard/settings"
          icon={<SettingsIcon className="h-4 w-4" />}
        >
          Settings
        </NavLink>
      </nav>
      <div className="border-t p-2">
        <UserMenu />
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
    >
      {icon}
      {children}
    </Link>
  );
}
