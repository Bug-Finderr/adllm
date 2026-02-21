import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("requests")
      .withIndex("by_userId_time", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = await ctx.db
      .query("requests")
      .withIndex("by_userId_time", (q) =>
        q.eq("userId", userId).gte("createdAt", dayAgo),
      )
      .collect();

    const total = recent.length;
    const totalCost = recent.reduce((s, r) => s + r.costUsd, 0);
    const cached = recent.filter((r) => r.cached).length;
    const cacheHitRate = total > 0 ? (cached / total) * 100 : 0;

    // Cost by model
    const byModel: Record<string, number> = {};
    for (const r of recent) {
      byModel[r.model] = (byModel[r.model] ?? 0) + r.costUsd;
    }

    // Ad metrics
    const adImpressions = recent.filter((r) => r.adId).length;
    const estimatedAdRevenue = (adImpressions / 1000) * 5.0; // $5 avg CPM
    const costOffset = totalCost > 0 ? (estimatedAdRevenue / totalCost) * 100 : 0;

    return { total, totalCost, cached, cacheHitRate, byModel, adImpressions, estimatedAdRevenue, costOffset };
  },
});

// Called by the proxy API route after a request completes
export const log = mutation({
  args: {
    userId: v.id("users"),
    model: v.string(),
    requestedModel: v.optional(v.string()),
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
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("requests", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
