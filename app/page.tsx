import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";
import {
  ActivityIcon,
  ArrowRightIcon,
  DatabaseIcon,
  MegaphoneIcon,
  TerminalIcon,
  ZapIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SplashCta } from "@/components/splash-cta";

export default async function HomePage() {
  if (await isAuthenticatedNextjs()) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 font-bold text-lg">
          <ZapIcon className="h-5 w-5 text-primary" />
          <span>AdLLM</span>
        </div>
        <Link
          href="/signin"
          className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
        >
          Get started
        </Link>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center md:pt-32 md:pb-24">
        <a href="https://github.com/Bug-Finderr/adllm" target="_blank" className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-primary text-xs">
          <ZapIcon className="h-3 w-3" />
          Open-source AI proxy for your IDE
        </a>
        <h1 className="mx-auto max-w-2xl font-bold text-4xl tracking-tight md:text-6xl">
          Your AI coding costs,{" "}
          <span className="bg-linear-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            subsidized
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-muted-foreground text-lg">
          One endpoint for every model. Smart routing picks the cheapest one.
          Sponsored content earns you free credits. Drop-in OpenAI compatible.
        </p>
        <div className="mt-8">
          <SplashCta />
        </div>

        {/* Terminal mockup */}
        <div className="mx-auto mt-12 max-w-lg overflow-hidden rounded-lg border bg-card shadow-2xl">
          <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
            <span className="ml-2 text-muted-foreground text-xs">
              IDE Settings
            </span>
          </div>
          <div className="p-4 text-left font-mono text-sm leading-relaxed">
            <p className="text-muted-foreground">
              <span className="text-emerald-400">// Cursor, VS Code, Continue.dev</span>
            </p>
            <p className="mt-1">
              <span className="text-blue-400">baseUrl</span>
              <span className="text-muted-foreground">: </span>
              <span className="text-amber-300">
                &quot;https://adllm.vercel.app/api/
                <span className="text-muted-foreground/70">{'<token>'}</span>
                /v1&quot;
              </span>
            </p>
            <p>
              <span className="text-blue-400">apiKey</span>
              <span className="text-muted-foreground">: </span>
              <span className="text-amber-300">&quot;anything&quot;</span>
            </p>
            <div className="mt-3 border-t border-dashed pt-3 text-xs text-muted-foreground">
              <p>
                <span className="text-green-400">&#10003;</span> Routed to gemini-2.0-flash{" "}
                <span className="text-emerald-400">(saved 80%)</span>
              </p>
              <p>
                <span className="text-green-400">&#10003;</span> +$0.005 credits from
                sponsored content
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/30 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-bold text-2xl tracking-tight md:text-3xl">
            Three steps to cheaper AI
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <Step
              n={1}
              title="Add your API keys"
              desc="Bring your own OpenAI, Anthropic, or Google keys. They're encrypted with AES-256 and never leave the server."
            />
            <Step
              n={2}
              title="Point your IDE"
              desc="Paste the proxy URL as your OpenAI base URL. Works with Cursor, VS Code, Continue.dev, and any OpenAI-compatible tool."
            />
            <Step
              n={3}
              title="Code & earn"
              desc="Every response includes a small sponsor message. That earns you credits that pay for future requests automatically."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-bold text-2xl tracking-tight md:text-3xl">
            Everything built in
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            No config files, no CLI tools. Just a URL that makes your AI usage smarter and cheaper.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FeatureCard
              icon={<ZapIcon className="h-5 w-5" />}
              title="Smart Routing"
              desc="AI classifier routes simple prompts to cheap models, complex ones to powerful models. Save 60-80% automatically."
              color="text-blue-400"
            />
            <FeatureCard
              icon={<DatabaseIcon className="h-5 w-5" />}
              title="Prompt Cache"
              desc="Ask the same question twice and pay $0.00 the second time. Cache hits are instant."
              color="text-emerald-400"
            />
            <FeatureCard
              icon={<ActivityIcon className="h-5 w-5" />}
              title="Context Injection"
              desc="Set your project context once. Every request gets it as a system prompt — no manual setup per IDE."
              color="text-amber-400"
            />
            <FeatureCard
              icon={<MegaphoneIcon className="h-5 w-5" />}
              title="Ad-Funded Credits"
              desc="A small sponsor note at the end of each response earns you credits. Use them to make free requests."
              color="text-purple-400"
            />
          </div>
        </div>
      </section>

      {/* IDE compatibility */}
      <section className="border-t bg-muted/30 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="font-medium text-muted-foreground text-sm uppercase tracking-wider">
            Works with any OpenAI-compatible tool
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {["Cursor", "VS Code Copilot", "Continue.dev", "JetBrains AI", "Cline", "Aider"].map(
              (ide) => (
                <span
                  key={ide}
                  className="flex items-center gap-2 font-medium text-lg text-muted-foreground"
                >
                  <TerminalIcon className="h-4 w-4" />
                  {ide}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="font-bold text-3xl tracking-tight md:text-4xl">
            Start saving today
          </h2>
          <p className="mt-4 text-muted-foreground">
            Free to use. Bring your own keys. Earn credits from day one.
          </p>
          <div className="mt-8">
            <Link
              href="/signin"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get started free
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 text-muted-foreground text-xs">
          <div className="flex items-center gap-1.5">
            <ZapIcon className="h-3.5 w-3.5" />
            <span>AdLLM</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Bug-Finderr/adllm"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            <Link
              href="/signin"
              className="transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({
  n,
  title,
  desc,
}: {
  n: number;
  title: string;
  desc: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-sm">
        {n}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-muted-foreground text-sm">{desc}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className={color}>{icon}</div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">
        {desc}
      </p>
    </div>
  );
}
