"use client";

import { MenuIcon, ZapIcon } from "lucide-react";
import { useState } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-14 items-center gap-3 border-b px-4 md:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
      >
        <MenuIcon className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </Button>
      <ZapIcon className="h-5 w-5 text-primary" />
      <span className="font-bold tracking-tight">AdLLM</span>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full flex-col">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
