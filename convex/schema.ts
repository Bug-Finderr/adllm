import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // Per-provider encrypted API keys
  apiKeys: defineTable({
    userId: v.id("users"),
    provider: v.union(
      v.literal("anthropic"),
      v.literal("openai"),
      v.literal("google"),
    ),
    encryptedKey: v.string(), // AES-GCM, base64
    iv: v.string(), // base64
    keyPreview: v.string(), // last 4 chars for display
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_provider", ["userId", "provider"]),

  // Every proxy request logged here
  requests: defineTable({
    userId: v.id("users"),
    model: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    costUsd: v.number(),
    cached: v.boolean(),
    latencyMs: v.number(),
    complexity: v.optional(
      v.union(v.literal("simple"), v.literal("medium"), v.literal("complex")),
    ),
    error: v.optional(v.string()),
    adId: v.optional(v.string()),
    creditsEarned: v.optional(v.number()),
    fundedByCredits: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_userId_time", ["userId", "createdAt"]),

  // Prompt cache (exact hash match)
  cache: defineTable({
    userId: v.id("users"),
    promptHash: v.string(),
    responseText: v.string(),
    model: v.string(),
    createdAt: v.number(),
  }).index("by_user_hash", ["userId", "promptHash"]),

  // AI model catalog (seeded, admin-managed)
  models: defineTable({
    modelId: v.string(), // e.g. "openai:gpt-5-mini"
    name: v.string(), // display name
    provider: v.string(), // "openai" | "anthropic" | "google"
    inputCostPer1MTokens: v.number(), // exact $/1M input tokens
    outputCostPer1MTokens: v.number(), // exact $/1M output tokens
    tier: v.string(), // "fast" | "balanced" | "powerful"
    enabled: v.boolean(),
  })
    .index("by_modelId", ["modelId"])
    .index("by_enabled", ["enabled"]),

  // Sponsored ads
  ads: defineTable({
    sponsor: v.string(),
    pitch: v.string(),
    url: v.string(),
    cpm: v.number(), // revenue per 1000 impressions (USD)
    active: v.boolean(),
  }),

  // User routing + injection settings
  settings: defineTable({
    userId: v.id("users"),
    relayToken: v.string(), // random hex token for proxy URL auth
    routingEnabled: v.boolean(),
    cacheEnabled: v.boolean(),
    adsEnabled: v.optional(v.boolean()),
    credits: v.optional(v.number()),
    systemPromptAddition: v.string(),
    preferredProvider: v.union(
      v.literal("anthropic"),
      v.literal("openai"),
      v.literal("google"),
    ),
    preferredModel: v.optional(v.string()), // e.g. "gpt-5-mini"
    routingSimpleModel: v.optional(v.string()), // e.g. "google:gemini-2.0-flash"
    routingMediumModel: v.optional(v.string()), // e.g. "openai:gpt-5-mini"
    routingComplexModel: v.optional(v.string()), // e.g. "anthropic:claude-sonnet-4-6"
    // Credit-funded model preferences (pool keys)
    creditSimpleModel: v.optional(v.string()),
    creditMediumModel: v.optional(v.string()),
    creditComplexModel: v.optional(v.string()),
    creditDefaultModel: v.optional(v.string()),
    lastAdEarnedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_relayToken", ["relayToken"]),
});
