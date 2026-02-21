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
    model: v.string(), // actual model used
    requestedModel: v.optional(v.string()), // what IDE asked for
    promptTokens: v.number(),
    completionTokens: v.number(),
    costUsd: v.number(),
    cached: v.boolean(),
    latencyMs: v.number(),
    complexity: v.optional(
      v.union(
        v.literal("simple"),
        v.literal("medium"),
        v.literal("complex"),
      ),
    ),
    error: v.optional(v.string()),
    adId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_userId_time", ["userId", "createdAt"]),

  // Semantic cache with vector embeddings
  cache: defineTable({
    userId: v.id("users"),
    promptHash: v.string(), // SHA-256 for exact dedup
    embedding: v.array(v.float64()), // 1536 dims (text-embedding-3-small)
    responseText: v.string(),
    model: v.string(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_hash", ["promptHash"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId"],
    }),

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
    systemPromptAddition: v.string(),
    preferredProvider: v.union(
      v.literal("anthropic"),
      v.literal("openai"),
      v.literal("google"),
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_relayToken", ["relayToken"]),
});
