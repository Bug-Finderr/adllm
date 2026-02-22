"use client";

import { LayoutDashboardIcon, SettingsIcon, ZapIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/utils";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <ZapIcon className="h-5 w-5 text-primary" />
        <span className="font-bold tracking-tight">AdLLM</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        <NavLink
          href="/dashboard"
          icon={<LayoutDashboardIcon className="h-4 w-4" />}
          onNavigate={onNavigate}
        >
          Dashboard
        </NavLink>
        <NavLink
          href="/dashboard/settings"
          icon={<SettingsIcon className="h-4 w-4" />}
          onNavigate={onNavigate}
        >
          Settings
        </NavLink>
      </nav>
      <div className="border-t p-2">
        <UserMenu />
      </div>
    </>
  );
}

function NavLink({
  href,
  icon,
  children,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 font-medium text-sm transition-colors",
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
