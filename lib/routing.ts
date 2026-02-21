import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

export type Complexity = "simple" | "medium" | "complex";

export interface RoutingDecision {
  complexity: Complexity;
  provider: "anthropic" | "openai" | "google";
  model: string;
}

const ROUTING_TABLE: Record<
  Complexity,
  { provider: "anthropic" | "openai" | "google"; model: string }
> = {
  simple: { provider: "google", model: "gemini-2.0-flash" },
  medium: { provider: "openai", model: "gpt-4o-mini" },
  complex: { provider: "anthropic", model: "claude-sonnet-4-5" },
};

// Known model → provider mapping for direct passthrough
export const MODEL_PROVIDER_MAP: Record<
  string,
  { provider: "anthropic" | "openai" | "google"; model: string }
> = {
  "gpt-4o": { provider: "openai", model: "gpt-4o" },
  "gpt-4o-mini": { provider: "openai", model: "gpt-4o-mini" },
  "gpt-4-turbo": { provider: "openai", model: "gpt-4-turbo" },
  "gpt-3.5-turbo": { provider: "openai", model: "gpt-3.5-turbo" },
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
  "gemini-2.0-flash": { provider: "google", model: "gemini-2.0-flash" },
  "gemini-1.5-pro": { provider: "google", model: "gemini-1.5-pro" },
  "gemini-1.5-flash": { provider: "google", model: "gemini-1.5-flash" },
};

export async function classifyAndRoute(
  promptText: string,
  geminiApiKey: string,
): Promise<RoutingDecision> {
  try {
    const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });
    const { object } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: z.object({
        complexity: z.enum(["simple", "medium", "complex"]),
      }),
      prompt: `Classify the complexity of this AI prompt. Reply with exactly one word.

simple = greeting, basic fact, math, short question (1-2 sentences)
medium = code snippet, explanation, moderate analysis
complex = multi-step reasoning, large code generation, architecture design, research

Prompt (first 300 chars): ${promptText.slice(0, 300)}`,
    });
    const complexity = object.complexity;
    return { complexity, ...ROUTING_TABLE[complexity] };
  } catch {
    // Fallback to medium if classifier fails
    return { complexity: "medium", ...ROUTING_TABLE.medium };
  }
}
