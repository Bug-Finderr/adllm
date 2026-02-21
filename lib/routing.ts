import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

export type Complexity = "simple" | "medium" | "complex";

export interface RoutingDecision {
  complexity: Complexity;
  provider: "anthropic" | "openai" | "google";
  model: string;
}

type Provider = "anthropic" | "openai" | "google";

// Preference order per complexity tier — picks first available provider
const ROUTING_PREFERENCES: Record<
  Complexity,
  Array<{ provider: Provider; model: string }>
> = {
  simple: [
    { provider: "google", model: "gemini-2.0-flash" },
    { provider: "openai", model: "gpt-4o-mini" },
    { provider: "anthropic", model: "claude-haiku-4-5" },
  ],
  medium: [
    { provider: "openai", model: "gpt-4o-mini" },
    { provider: "google", model: "gemini-2.0-flash" },
    { provider: "anthropic", model: "claude-haiku-4-5" },
  ],
  complex: [
    { provider: "anthropic", model: "claude-sonnet-4-5" },
    { provider: "openai", model: "gpt-4o" },
    { provider: "google", model: "gemini-2.0-flash" },
  ],
};

function pickForComplexity(
  complexity: Complexity,
  available: Provider[],
): { provider: Provider; model: string } {
  const prefs = ROUTING_PREFERENCES[complexity];
  const match = prefs.find((p) => available.includes(p.provider));
  return match ?? prefs[0]; // fallback: return first preference even if key missing
}

// Known model → provider mapping for direct passthrough
export const MODEL_PROVIDER_MAP: Record<
  string,
  { provider: Provider; model: string }
> = {
  "gpt-4o": { provider: "openai", model: "gpt-4o" },
  "gpt-4o-mini": { provider: "openai", model: "gpt-4o-mini" },
  "gpt-4-turbo": { provider: "openai", model: "gpt-4-turbo" },
  "gpt-3.5-turbo": { provider: "openai", model: "gpt-3.5-turbo" },
  "gpt-4.1": { provider: "openai", model: "gpt-4.1" },
  "gpt-4.1-mini": { provider: "openai", model: "gpt-4.1-mini" },
  "claude-3-5-sonnet-20241022": {
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
  },
  "claude-3-haiku-20240307": {
    provider: "anthropic",
    model: "claude-3-haiku-20240307",
  },
  "claude-sonnet-4-5": { provider: "anthropic", model: "claude-sonnet-4-5" },
  "claude-haiku-4-5": { provider: "anthropic", model: "claude-haiku-4-5" },
  "claude-opus-4-5": { provider: "anthropic", model: "claude-opus-4-5" },
  "gemini-2.0-flash": { provider: "google", model: "gemini-2.0-flash" },
  "gemini-1.5-pro": { provider: "google", model: "gemini-1.5-pro" },
  "gemini-1.5-flash": { provider: "google", model: "gemini-1.5-flash" },
};

export async function classifyAndRoute(
  promptText: string,
  geminiApiKey: string,
  availableProviders: Provider[],
): Promise<RoutingDecision> {
  let complexity: Complexity = "medium"; // default

  try {
    const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });
    const { object } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: z.object({
        complexity: z.enum(["simple", "medium", "complex"]),
      }),
      prompt: `Classify the complexity of this AI prompt. One word only.

simple = greeting, basic fact, math, short question
medium = code snippet, explanation, moderate analysis
complex = multi-step reasoning, large code generation, architecture design

Prompt: ${promptText.slice(0, 300)}`,
    });
    complexity = object.complexity;
  } catch {
    // Classifier failed — fall through with default "medium"
  }

  const picked = pickForComplexity(complexity, availableProviders);
  return { complexity, ...picked };
}
