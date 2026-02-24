import { internalMutation, query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("models")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();
  },
});

// All language models from https://ai-sdk.dev/providers/ai-sdk-providers
// Pricing: exact input/output per 1M tokens (USD) from official pricing pages.
// Sources:
//   Google:    https://ai.google.dev/gemini-api/docs/pricing
//   OpenAI:    https://openai.com/api/pricing/
//   Anthropic: https://www.anthropic.com/pricing
const MODELS = [
  // ── Google ────────────────────────────────────────────────────
  {
    modelId: "google:gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "google",
    inputCostPer1MTokens: 0.1,
    outputCostPer1MTokens: 0.4,
    tier: "fast",
  },
  {
    modelId: "google:gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "google",
    inputCostPer1MTokens: 0.1,
    outputCostPer1MTokens: 0.4,
    tier: "fast",
  },
  {
    modelId: "google:gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    inputCostPer1MTokens: 0.15,
    outputCostPer1MTokens: 0.6,
    tier: "fast",
  },
  {
    modelId: "google:gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    inputCostPer1MTokens: 1.25,
    outputCostPer1MTokens: 10.0,
    tier: "powerful",
  },
  {
    modelId: "google:gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    provider: "google",
    inputCostPer1MTokens: 0.5,
    outputCostPer1MTokens: 3.0,
    tier: "balanced",
  },
  {
    modelId: "google:gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    provider: "google",
    inputCostPer1MTokens: 2.0,
    outputCostPer1MTokens: 12.0,
    tier: "powerful",
  },
  {
    modelId: "google:gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    provider: "google",
    inputCostPer1MTokens: 2.0,
    outputCostPer1MTokens: 12.0,
    tier: "powerful",
  },
  {
    modelId: "google:gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "google",
    inputCostPer1MTokens: 1.25,
    outputCostPer1MTokens: 5.0,
    tier: "balanced",
  },
  {
    modelId: "google:gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "google",
    inputCostPer1MTokens: 0.075,
    outputCostPer1MTokens: 0.3,
    tier: "fast",
  },
  {
    modelId: "google:gemini-1.5-flash-8b",
    name: "Gemini 1.5 Flash 8B",
    provider: "google",
    inputCostPer1MTokens: 0.04,
    outputCostPer1MTokens: 0.15,
    tier: "fast",
  },
  // ── OpenAI ────────────────────────────────────────────────────
  {
    modelId: "openai:gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "openai",
    inputCostPer1MTokens: 0.05,
    outputCostPer1MTokens: 0.4,
    tier: "fast",
  },
  {
    modelId: "openai:gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    provider: "openai",
    inputCostPer1MTokens: 0.1,
    outputCostPer1MTokens: 0.4,
    tier: "fast",
  },
  {
    modelId: "openai:gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    inputCostPer1MTokens: 0.15,
    outputCostPer1MTokens: 0.6,
    tier: "fast",
  },
  {
    modelId: "openai:gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "openai",
    inputCostPer1MTokens: 0.25,
    outputCostPer1MTokens: 2.0,
    tier: "balanced",
  },
  {
    modelId: "openai:gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "openai",
    inputCostPer1MTokens: 0.4,
    outputCostPer1MTokens: 1.6,
    tier: "balanced",
  },
  {
    modelId: "openai:gpt-5.1-codex-mini",
    name: "GPT-5.1 Codex Mini",
    provider: "openai",
    inputCostPer1MTokens: 0.25,
    outputCostPer1MTokens: 2.0,
    tier: "balanced",
  },
  {
    modelId: "openai:o3-mini",
    name: "o3 Mini",
    provider: "openai",
    inputCostPer1MTokens: 1.1,
    outputCostPer1MTokens: 4.4,
    tier: "balanced",
  },
  {
    modelId: "openai:o4-mini",
    name: "o4 Mini",
    provider: "openai",
    inputCostPer1MTokens: 1.1,
    outputCostPer1MTokens: 4.4,
    tier: "balanced",
  },
  {
    modelId: "openai:gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    inputCostPer1MTokens: 2.0,
    outputCostPer1MTokens: 8.0,
    tier: "balanced",
  },
  {
    modelId: "openai:gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    inputCostPer1MTokens: 2.5,
    outputCostPer1MTokens: 10.0,
    tier: "balanced",
  },
  {
    modelId: "openai:gpt-5",
    name: "GPT-5",
    provider: "openai",
    inputCostPer1MTokens: 1.25,
    outputCostPer1MTokens: 10.0,
    tier: "powerful",
  },
  {
    modelId: "openai:gpt-5-codex",
    name: "GPT-5 Codex",
    provider: "openai",
    inputCostPer1MTokens: 1.25,
    outputCostPer1MTokens: 10.0,
    tier: "powerful",
  },
  {
    modelId: "openai:gpt-5.1",
    name: "GPT-5.1",
    provider: "openai",
    inputCostPer1MTokens: 1.25,
    outputCostPer1MTokens: 10.0,
    tier: "powerful",
  },
  {
    modelId: "openai:gpt-5.1-codex",
    name: "GPT-5.1 Codex",
    provider: "openai",
    inputCostPer1MTokens: 1.25,
    outputCostPer1MTokens: 10.0,
    tier: "powerful",
  },
  {
    modelId: "openai:gpt-5.2",
    name: "GPT-5.2",
    provider: "openai",
    inputCostPer1MTokens: 1.75,
    outputCostPer1MTokens: 14.0,
    tier: "powerful",
  },
  {
    modelId: "openai:o3",
    name: "o3",
    provider: "openai",
    inputCostPer1MTokens: 2.0,
    outputCostPer1MTokens: 8.0,
    tier: "powerful",
  },
  {
    modelId: "openai:o1",
    name: "o1",
    provider: "openai",
    inputCostPer1MTokens: 15.0,
    outputCostPer1MTokens: 60.0,
    tier: "powerful",
  },
  {
    modelId: "openai:gpt-5-pro",
    name: "GPT-5 Pro",
    provider: "openai",
    inputCostPer1MTokens: 15.0,
    outputCostPer1MTokens: 120.0,
    tier: "powerful",
  },
  {
    modelId: "openai:gpt-5.2-pro",
    name: "GPT-5.2 Pro",
    provider: "openai",
    inputCostPer1MTokens: 21.0,
    outputCostPer1MTokens: 168.0,
    tier: "powerful",
  },
  // ── Anthropic ─────────────────────────────────────────────────
  {
    modelId: "anthropic:claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    inputCostPer1MTokens: 1.0,
    outputCostPer1MTokens: 5.0,
    tier: "balanced",
  },
  {
    modelId: "anthropic:claude-sonnet-4-0",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    inputCostPer1MTokens: 3.0,
    outputCostPer1MTokens: 15.0,
    tier: "balanced",
  },
  {
    modelId: "anthropic:claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    inputCostPer1MTokens: 3.0,
    outputCostPer1MTokens: 15.0,
    tier: "balanced",
  },
  {
    modelId: "anthropic:claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    inputCostPer1MTokens: 3.0,
    outputCostPer1MTokens: 15.0,
    tier: "balanced",
  },
  {
    modelId: "anthropic:claude-opus-4-0",
    name: "Claude Opus 4",
    provider: "anthropic",
    inputCostPer1MTokens: 15.0,
    outputCostPer1MTokens: 75.0,
    tier: "powerful",
  },
  {
    modelId: "anthropic:claude-opus-4-1",
    name: "Claude Opus 4.1",
    provider: "anthropic",
    inputCostPer1MTokens: 15.0,
    outputCostPer1MTokens: 75.0,
    tier: "powerful",
  },
  {
    modelId: "anthropic:claude-opus-4-5",
    name: "Claude Opus 4.5",
    provider: "anthropic",
    inputCostPer1MTokens: 5.0,
    outputCostPer1MTokens: 25.0,
    tier: "powerful",
  },
  {
    modelId: "anthropic:claude-opus-4-6",
    name: "Claude Opus 4.6",
    provider: "anthropic",
    inputCostPer1MTokens: 5.0,
    outputCostPer1MTokens: 25.0,
    tier: "powerful",
  },
];

export const seed = internalMutation({
  handler: async (ctx) => {
    // Clear all existing models first (schema changed — fields renamed)
    const existing = await ctx.db.query("models").collect();
    for (const m of existing) await ctx.db.delete(m._id);

    // Insert all models fresh
    for (const model of MODELS) {
      await ctx.db.insert("models", { ...model, enabled: true });
    }
  },
});
