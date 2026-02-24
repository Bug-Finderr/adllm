"use client";

import { useMutation, useQuery } from "convex/react";
import { ExternalLinkIcon } from "lucide-react";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getPoolProviders } from "@/app/actions/pool-providers";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import {
  DEFAULT_MODEL_ID,
  modelProvider,
  PROVIDER_COLOR,
  PROVIDER_DISPLAY,
  PROVIDERS,
  type Provider,
} from "@/lib/models";
import { ROUTING_PREFERENCES } from "@/lib/routing";
import { cn } from "@/lib/utils";

const PRICING_LINKS: Record<Provider, { label: string; url: string }> = {
  openai: { label: "OpenAI pricing", url: "https://openai.com/api/pricing/" },
  anthropic: {
    label: "Anthropic pricing",
    url: "https://www.anthropic.com/pricing",
  },
  google: {
    label: "Google AI pricing",
    url: "https://ai.google.dev/gemini-api/docs/pricing",
  },
};

const TIER_COLOR: Record<string, string> = {
  fast: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  balanced: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  powerful:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

/** Resolve a saved modelId only if the user still has the provider key */
function validModelForKeys(
  modelId: string | undefined,
  configuredProviders: string[],
): string | undefined {
  if (!modelId) return undefined;
  return configuredProviders.includes(modelProvider(modelId))
    ? modelId
    : undefined;
}

/** Shared model dropdown with provider groups, badges, and tier labels */
function ModelSelect({
  value,
  onValueChange,
  modelsByProvider,
  configuredProviders,
}: {
  value: string | undefined;
  onValueChange: (v: string) => void;
  modelsByProvider: Record<
    string,
    | Array<{ modelId: string; name: string; provider: string; tier: string }>
    | undefined
  >;
  configuredProviders: string[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Choose a model…" />
      </SelectTrigger>
      <SelectContent>
        {PROVIDERS.map((provider, i) => {
          const provModels = modelsByProvider[provider] ?? [];
          if (provModels.length === 0) return null;
          const hasKey = configuredProviders.includes(provider);
          return (
            <SelectGroup key={provider}>
              {i > 0 && <SelectSeparator />}
              <SelectLabel className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 font-medium text-xs",
                    PROVIDER_COLOR[provider],
                  )}
                >
                  {PROVIDER_DISPLAY[provider]}
                </span>
                {!hasKey && (
                  <span className="font-normal text-muted-foreground text-xs">
                    (no key)
                  </span>
                )}
              </SelectLabel>
              {provModels.map((m) => (
                <SelectItem
                  key={m.modelId}
                  value={m.modelId}
                  disabled={!hasKey}
                >
                  <span className="flex items-center gap-2">
                    {m.name}
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xs",
                        TIER_COLOR[m.tier],
                      )}
                    >
                      {m.tier}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export default function SettingsPage() {
  const settings = useQuery(api.settings.get);
  const apiKeys = useQuery(api.apiKeys.list);
  const models = useQuery(api.models.list);
  const update = useMutation(api.settings.update);

  const configuredProviders = (apiKeys ?? []).map(
    (k: { provider: string }) => k.provider,
  );

  // Group models by provider
  const modelsByProvider: Record<string, typeof models> = {};
  for (const m of models ?? []) {
    if (!modelsByProvider[m.provider]) modelsByProvider[m.provider] = [];
    modelsByProvider[m.provider]!.push(m);
  }

  // Default model — only valid if user has the key
  const selectedModelId =
    validModelForKeys(settings?.preferredModel, configuredProviders) ??
    (configuredProviders.includes("openai") ? DEFAULT_MODEL_ID : undefined);

  // Routing tier fields + defaults
  const ROUTING_FIELDS = {
    simple: "routingSimpleModel",
    medium: "routingMediumModel",
    complex: "routingComplexModel",
  } as const;

  function routingValue(tier: "simple" | "medium" | "complex") {
    const saved = settings?.[ROUTING_FIELDS[tier]];
    if (validModelForKeys(saved, configuredProviders)) return saved;
    const match = ROUTING_PREFERENCES[tier].find((p) =>
      configuredProviders.includes(p.provider),
    );
    return match ? `${match.provider}:${match.model}` : undefined;
  }

  // Pool providers (server-side env vars) for credit model dropdowns
  const [poolProviders, setPoolProviders] = useState<string[]>([]);
  useEffect(() => {
    getPoolProviders().then(setPoolProviders);
  }, []);

  // Credit routing tier fields + defaults
  const CREDIT_ROUTING_FIELDS = {
    simple: "creditSimpleModel",
    medium: "creditMediumModel",
    complex: "creditComplexModel",
  } as const;

  function creditRoutingValue(tier: "simple" | "medium" | "complex") {
    const saved = settings?.[CREDIT_ROUTING_FIELDS[tier]];
    if (saved && poolProviders.includes(modelProvider(saved))) return saved;
    const match = ROUTING_PREFERENCES[tier].find((p) =>
      poolProviders.includes(p.provider),
    );
    return match ? `${match.provider}:${match.model}` : undefined;
  }

  function creditDefaultValue() {
    const saved = settings?.creditDefaultModel;
    if (saved && poolProviders.includes(modelProvider(saved))) return saved;
    const match = ROUTING_PREFERENCES.medium.find((p) =>
      poolProviders.includes(p.provider),
    );
    return match ? `${match.provider}:${match.model}` : undefined;
  }

  async function toggle(
    key: "routingEnabled" | "cacheEnabled" | "adsEnabled",
    value: boolean,
  ) {
    await update({ [key]: value });
    toast.success("Settings saved");
    posthog.capture(
      {
        routingEnabled: "smart_routing_toggled",
        cacheEnabled: "semantic_cache_toggled",
        adsEnabled: "ad_injection_toggled",
      }[key],
      { enabled: value },
    );
  }

  async function selectModel(fullModelId: string, provider: string) {
    await update({
      preferredModel: fullModelId,
      preferredProvider: provider as Provider,
    });
    const model = (models ?? []).find((m) => m.modelId === fullModelId);
    toast.success(`Default model set to ${model?.name ?? fullModelId}`);
    posthog.capture("preferred_model_changed", {
      model: fullModelId,
      provider,
    });
  }

  async function saveSystemPrompt(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const prompt = new FormData(e.currentTarget).get("prompt") as string;
    await update({ systemPromptAddition: prompt });
    toast.success("Context saved");
    posthog.capture("context_prompt_saved", {
      prompt_length: prompt.trim().length,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure your AdLLM proxy
        </p>
      </div>

      <ApiKeyForm />

      {/* Model Configuration — tabbed: Your Keys / Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Model Configuration</CardTitle>
          <CardDescription>
            Smart routing classifies prompts and picks the cheapest capable
            model per tier.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable smart routing</Label>
              <p className="text-muted-foreground text-xs">
                Uses Gemini 3 Flash to classify prompts
              </p>
            </div>
            <Switch
              checked={settings?.routingEnabled ?? true}
              onCheckedChange={(v) => toggle("routingEnabled", v)}
            />
          </div>

          <Separator />

          <Tabs defaultValue="own-keys">
            <TabsList className="w-full">
              <TabsTrigger value="own-keys" className="flex-1">
                Your Keys
              </TabsTrigger>
              <TabsTrigger value="credits" className="flex-1">
                Credits
              </TabsTrigger>
            </TabsList>

            {/* Your Keys tab */}
            <TabsContent value="own-keys" className="space-y-4 pt-2">
              <div className="space-y-3">
                {(["simple", "medium", "complex"] as const).map((tier) => (
                  <div key={tier} className="flex items-center gap-3">
                    <span className="w-18 shrink-0 text-muted-foreground text-sm capitalize">
                      {tier}
                    </span>
                    <ModelSelect
                      value={routingValue(tier)}
                      onValueChange={async (v) => {
                        await update({ [ROUTING_FIELDS[tier]]: v });
                        const model = (models ?? []).find(
                          (m) => m.modelId === v,
                        );
                        toast.success(
                          `${tier} tier set to ${model?.name ?? v}`,
                        );
                        posthog.capture("routing_model_changed", {
                          tier,
                          model: v,
                        });
                      }}
                      modelsByProvider={modelsByProvider}
                      configuredProviders={configuredProviders}
                    />
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">
                  Default model (when routing is off)
                </Label>
                {!models ? (
                  <div className="h-9 animate-pulse rounded bg-muted" />
                ) : (
                  <ModelSelect
                    value={selectedModelId}
                    onValueChange={(v) => {
                      const model = (models ?? []).find((m) => m.modelId === v);
                      if (model) selectModel(model.modelId, model.provider);
                    }}
                    modelsByProvider={modelsByProvider}
                    configuredProviders={configuredProviders}
                  />
                )}
              </div>

              {configuredProviders.length === 0 && (
                <p className="text-amber-500 text-xs">
                  Add at least one API key above for routing to work.
                </p>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {PROVIDERS.map((provider) => (
                  <a
                    key={provider}
                    href={PRICING_LINKS[provider].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
                  >
                    {PRICING_LINKS[provider].label}
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </TabsContent>

            {/* Credits tab */}
            <TabsContent value="credits" className="space-y-4 pt-2">
              {poolProviders.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No credit inference providers available.
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {(["simple", "medium", "complex"] as const).map((tier) => (
                      <div key={tier} className="flex items-center gap-3">
                        <span className="w-18 shrink-0 text-muted-foreground text-sm capitalize">
                          {tier}
                        </span>
                        <ModelSelect
                          value={creditRoutingValue(tier)}
                          onValueChange={async (v) => {
                            await update({
                              [CREDIT_ROUTING_FIELDS[tier]]: v,
                            });
                            const model = (models ?? []).find(
                              (m) => m.modelId === v,
                            );
                            toast.success(
                              `Credit ${tier} tier set to ${model?.name ?? v}`,
                            );
                            posthog.capture("credit_routing_model_changed", {
                              tier,
                              model: v,
                            });
                          }}
                          modelsByProvider={modelsByProvider}
                          configuredProviders={poolProviders}
                        />
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">
                      Default model (when routing is off)
                    </Label>
                    <ModelSelect
                      value={creditDefaultValue()}
                      onValueChange={async (v) => {
                        await update({ creditDefaultModel: v });
                        const model = (models ?? []).find(
                          (m) => m.modelId === v,
                        );
                        toast.success(
                          `Credit default set to ${model?.name ?? v}`,
                        );
                        posthog.capture("credit_default_model_changed", {
                          model: v,
                        });
                      }}
                      modelsByProvider={modelsByProvider}
                      configuredProviders={poolProviders}
                    />
                  </div>

                  <p className="text-muted-foreground text-xs">
                    Available providers:{" "}
                    {poolProviders
                      .map((p) => PROVIDER_DISPLAY[p as Provider])
                      .join(", ")}
                  </p>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Context Injection */}
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

      {/* Prompt Cache */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prompt Cache</CardTitle>
          <CardDescription>
            Identical prompts return cached responses instantly at $0.00 cost.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable prompt cache</Label>
              <p className="text-muted-foreground text-xs">
                Identical prompts return cached responses instantly
              </p>
            </div>
            <Switch
              checked={settings?.cacheEnabled ?? true}
              onCheckedChange={(v) => toggle("cacheEnabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sponsored Ads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sponsored Ads</CardTitle>
          <CardDescription>
            Show a small sponsored message at the end of each AI response. Earn
            free credits for API usage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable ad injection</Label>
              <p className="text-muted-foreground text-xs">
                Appends a sponsor card to each response in your IDE
              </p>
            </div>
            <Switch
              checked={settings?.adsEnabled ?? true}
              onCheckedChange={(v) => toggle("adsEnabled", v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
