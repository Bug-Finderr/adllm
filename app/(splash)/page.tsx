import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";
import { ActivityIcon, DatabaseIcon, ZapIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { SplashCta } from "@/components/splash-cta";

export default async function HomePage() {
  if (await isAuthenticatedNextjs()) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-12 px-4 py-16">
      <div className="text-center space-y-4 max-w-xl">
        <div className="flex items-center justify-center gap-2 text-4xl font-bold">
          <ZapIcon className="h-10 w-10 text-primary" />
          <span>Relay</span>
        </div>
        <p className="text-xl text-muted-foreground">
          One endpoint. All your models. Bring your own keys.
        </p>
        <p className="text-sm text-muted-foreground">
          Point Cursor, VS Code, or Continue.dev at your Relay URL — get smart routing,
          semantic caching, and context injection automatically.
        </p>
        <SplashCta />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-2xl w-full">
        <FeatureCard
          icon={<ZapIcon className="h-5 w-5" />}
          title="Smart Routing"
          desc="AI classifier routes simple prompts to Gemini Flash ($0.075/MTok), complex to Claude Sonnet. Save 60–80% on costs automatically."
        />
        <FeatureCard
          icon={<DatabaseIcon className="h-5 w-5" />}
          title="Semantic Cache"
          desc="Similar prompts return cached responses instantly. Same question twice = $0.00 cost. Cache hit shown in real-time dashboard."
        />
        <FeatureCard
          icon={<ActivityIcon className="h-5 w-5" />}
          title="Context Injection"
          desc="Add your project context once. Every request gets it automatically — no manual system prompts in your IDE."
        />
      </div>

      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground">Works with</p>
        <div className="flex gap-4 text-sm font-medium text-muted-foreground">
          <span>Cursor</span>
          <span>·</span>
          <span>VS Code Copilot</span>
          <span>·</span>
          <span>Continue.dev</span>
          <span>·</span>
          <span>JetBrains AI</span>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="text-primary">{icon}</div>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
