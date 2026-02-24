import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { Provider } from "./models";

type Complexity = "simple" | "medium" | "complex";

interface RoutingDecision {
  complexity: Complexity;
  provider: Provider;
  model: string; // bare model ID (e.g. "gpt-5-mini")
}

// Preference order per complexity tier — picks first available provider.
// These are strategic routing decisions, not model metadata.
// Uses bare model IDs (without provider prefix).
export const ROUTING_PREFERENCES: Record<
  Complexity,
  Array<{ provider: Provider; model: string }>
> = {
  simple: [
    { provider: "google", model: "gemini-2.0-flash" },
    { provider: "openai", model: "gpt-4.1-nano" },
    { provider: "anthropic", model: "claude-haiku-4-5" },
  ],
  medium: [
    { provider: "openai", model: "gpt-5-mini" },
    { provider: "google", model: "gemini-3-flash-preview" },
    { provider: "anthropic", model: "claude-haiku-4-5" },
  ],
  complex: [
    { provider: "anthropic", model: "claude-sonnet-4-6" },
    { provider: "openai", model: "gpt-5" },
    { provider: "google", model: "gemini-3-pro-preview" },
  ],
};

function pickForComplexity(
  complexity: Complexity,
  available: Provider[],
  userOverride?: { provider: Provider; model: string },
): { provider: Provider; model: string } {
  // User-configured model takes priority if they have the key
  if (userOverride && available.includes(userOverride.provider)) {
    return userOverride;
  }
  const prefs = ROUTING_PREFERENCES[complexity];
  const match = prefs.find((p) => available.includes(p.provider));
  return match ?? prefs[0];
}

export async function classifyAndRoute(
  promptText: string,
  geminiApiKey: string,
  availableProviders: Provider[],
  userRouting?: Partial<
    Record<Complexity, { provider: Provider; model: string }>
  >,
): Promise<RoutingDecision> {
  let complexity: Complexity = "medium";

  try {
    const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });
    const { output } = await generateText({
      model: google("gemini-3-flash-preview"),
      output: Output.object({
        schema: z.object({
          complexity: z.enum(["simple", "medium", "complex"]),
        }),
      }),
      prompt: `Classify the complexity of this AI prompt. One word only.

simple = greeting, basic fact, math, short question
medium = code snippet, explanation, moderate analysis
complex = multi-step reasoning, large code generation, architecture design

Prompt: ${promptText.slice(0, 300)}`,
    });
    if (output) complexity = output.complexity;
  } catch {
    // Classifier failed — fall through with default "medium"
  }

  const picked = pickForComplexity(
    complexity,
    availableProviders,
    userRouting?.[complexity],
  );
  return { complexity, ...picked };
}
