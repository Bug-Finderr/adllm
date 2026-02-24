// Types and constants for the model system.
// Model DATA lives in the Convex `models` table (see convex/models.ts).

export type Provider = "anthropic" | "openai" | "google";

export const PROVIDERS: Provider[] = ["google", "openai", "anthropic"];

/** Provider display names for UI */
export const PROVIDER_DISPLAY: Record<Provider, string> = {
  google: "Google (Gemini)",
  openai: "OpenAI",
  anthropic: "Anthropic",
};

/** Tailwind color classes per provider — shared across all UI */
export const PROVIDER_COLOR: Record<Provider, string> = {
  google: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  openai:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  anthropic:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

/** Default model when no preference is set (must match a modelId in DB) */
export const DEFAULT_MODEL_ID = "openai:gpt-5-mini";

/** Extract the bare model name from a prefixed modelId (e.g. "openai:gpt-5-mini" → "gpt-5-mini") */
export function bareModelId(modelId: string): string {
  const idx = modelId.indexOf(":");
  return idx >= 0 ? modelId.slice(idx + 1) : modelId;
}

/** Extract the provider from a prefixed modelId (e.g. "openai:gpt-5-mini" → "openai") */
export function modelProvider(modelId: string): Provider {
  const idx = modelId.indexOf(":");
  return (idx >= 0 ? modelId.slice(0, idx) : "openai") as Provider;
}
