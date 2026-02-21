"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast, Toaster } from "sonner";
import posthog from "posthog-js";

export default function SignInPage() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("flow", flow);
    const email = formData.get("email") as string;
    try {
      await signIn("password", formData);
      // Identify the user and capture login/signup event
      posthog.identify(email, { email });
      posthog.capture(flow === "signIn" ? "user_signed_in" : "user_signed_up", {
        email,
      });
      window.location.href = "/dashboard";
    } catch {
      const errorMsg =
        flow === "signIn"
          ? "Invalid email or password"
          : "Could not create account. Try a different email.";
      toast.error(errorMsg);
      posthog.capture("sign_in_failed", { flow, email });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-bold tracking-tight">⚡ Relay</h1>
          <p className="text-sm text-muted-foreground">
            One endpoint. All your models.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={flow === "signIn" ? "current-password" : "new-password"}
              required
              minLength={8}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "..."
              : flow === "signIn"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {flow === "signIn" ? "No account?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium underline underline-offset-4 hover:text-primary"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
      <Toaster />
    </div>
  );
}
