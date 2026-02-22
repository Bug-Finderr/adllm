"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";

export function SplashCta() {
  return (
    <div className="flex justify-center gap-3 pt-2">
      <Link href="/signin">
        <Button
          size="lg"
          onClick={() => posthog.capture("get_started_clicked")}
        >
          Get started free
        </Button>
      </Link>
      <Link href="/signin">
        <Button
          size="lg"
          variant="outline"
          onClick={() => posthog.capture("sign_in_cta_clicked")}
        >
          Sign in
        </Button>
      </Link>
    </div>
  );
}
