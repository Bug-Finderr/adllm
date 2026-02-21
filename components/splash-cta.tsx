"use client";

import { Button } from "@/components/ui/button";
import posthog from "posthog-js";
import Link from "next/link";

export function SplashCta() {
  return (
    <div className="flex gap-3 justify-center pt-2">
      <Link href="/signin">
        <Button size="lg" onClick={() => posthog.capture("get_started_clicked")}>
          Get started free
        </Button>
      </Link>
      <Link href="/signin">
        <Button size="lg" variant="outline">Sign in</Button>
      </Link>
    </div>
  );
}
