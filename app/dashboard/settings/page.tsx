"use client";

import { ApiKeyForm } from "@/components/api-key-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

export default function SettingsPage() {
  const settings = useQuery(api.settings.get);
  const update = useMutation(api.settings.update);

  async function toggle(
    key: "routingEnabled" | "cacheEnabled",
    value: boolean,
  ) {
    await update({ [key]: value });
    toast.success("Settings saved");
  }

  async function saveSystemPrompt(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await update({ systemPromptAddition: fd.get("prompt") as string });
    toast.success("Context saved");
  }

  async function setProvider(
    v: "anthropic" | "openai" | "google",
  ) {
    await update({ preferredProvider: v });
    toast.success("Default provider updated");
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your Relay proxy
        </p>
      </div>

      <ApiKeyForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Smart Routing</CardTitle>
          <CardDescription>
            Automatically routes requests to the cheapest capable model based on
            prompt complexity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable smart routing</Label>
              <p className="text-xs text-muted-foreground">
                Uses Gemini Flash to classify prompts
              </p>
            </div>
            <Switch
              checked={settings?.routingEnabled ?? true}
              onCheckedChange={(v) => toggle("routingEnabled", v)}
            />
          </div>

          <Separator />

          <div className="rounded-md border text-xs overflow-hidden">
            <div className="grid grid-cols-3 bg-muted px-3 py-2 font-medium">
              <span>Complexity</span>
              <span>Model</span>
              <span>Cost / 1M tokens</span>
            </div>
            {[
              { c: "simple", m: "Gemini Flash", cost: "$0.075" },
              { c: "medium", m: "GPT-4o Mini", cost: "$0.15" },
              { c: "complex", m: "Claude Sonnet", cost: "$3.00" },
            ].map((row) => (
              <div
                key={row.c}
                className="grid grid-cols-3 border-t px-3 py-2"
              >
                <span className="capitalize text-muted-foreground">
                  {row.c}
                </span>
                <span>{row.m}</span>
                <span className="font-mono">{row.cost}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Fallback provider (when routing is off)</Label>
            <Select
              value={settings?.preferredProvider ?? "anthropic"}
              onValueChange={(v) =>
                setProvider(v as "anthropic" | "openai" | "google")
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="google">Google (Gemini)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Context Injection</CardTitle>
          <CardDescription>
            This text is automatically prepended to every request sent through
            your proxy as a system prompt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveSystemPrompt} className="space-y-3">
            <Textarea
              name="prompt"
              defaultValue={settings?.systemPromptAddition ?? ""}
              placeholder="e.g. I'm building a Next.js + Convex app. Always suggest Convex patterns. Prefer TypeScript."
              className="min-h-24 font-mono text-sm"
            />
            <Button type="submit" size="sm">
              Save context
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Semantic Cache</CardTitle>
          <CardDescription>
            Similar prompts return cached responses instantly at $0.00 cost.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable semantic cache</Label>
              <p className="text-xs text-muted-foreground">
                Exact matches always cached; similar matches via vector search
              </p>
            </div>
            <Switch
              checked={settings?.cacheEnabled ?? true}
              onCheckedChange={(v) => toggle("cacheEnabled", v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
