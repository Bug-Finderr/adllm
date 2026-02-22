"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { PersonIcon } from "@radix-ui/react-icons";
import { useQuery } from "convex/react";
import posthog from "posthog-js";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";

export function UserMenu() {
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.users.viewer);

  return (
    <div className="flex items-center gap-2 font-medium text-sm">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 px-2 text-muted-foreground text-xs"
          >
            <PersonIcon className="h-4 w-4" />
            <span className="max-w-[120px] truncate">
              {viewer?.email ?? "Account"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="truncate font-normal text-muted-foreground text-xs">
            {viewer?.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-2 py-1 font-normal text-xs">
            Theme
            <ThemeToggle />
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-xs"
            onClick={() => {
              posthog.capture("user_signed_out");
              posthog.reset();
              void signOut();
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
