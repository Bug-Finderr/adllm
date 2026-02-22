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

    const byModel: Record<string, number> = {};
    for (const r of recent) {
      byModel[r.model] = (byModel[r.model] ?? 0) + r.costUsd;
    }

    const adImpressions = recent.filter((r) => r.adId).length;
    const creditsEarned = (adImpressions / 1000) * 5.0 * 0.9; // 90% of $5 avg CPM
    const costOffset = totalCost > 0 ? (creditsEarned / totalCost) * 100 : 0;
    const creditFunded = recent.filter((r) => r.fundedByCredits).length;
    const totalSavings = recent
      .filter((r) => r.fundedByCredits)
      .reduce((s, r) => s + r.costUsd, 0);

    return { total, totalCost, cached, cacheHitRate, byModel, adImpressions, creditsEarned, costOffset, creditFunded, totalSavings };
  },
});

export const getHistoricalStats = query({
  args: {
    range: v.union(
      v.literal("24h"),
      v.literal("7d"),
      v.literal("30d"),
      v.literal("all"),
    ),
  },
  handler: async (ctx, { range }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const now = Date.now();
    const rangeMs: Record<string, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      all: now,
    };
    const cutoff = now - rangeMs[range];

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_userId_time", (q) =>
        q.eq("userId", userId).gte("createdAt", cutoff),
      )
      .collect();

    const total = requests.length;
    const totalCost = requests.reduce((s, r) => s + r.costUsd, 0);
    const cached = requests.filter((r) => r.cached).length;
    const cacheHitRate = total > 0 ? (cached / total) * 100 : 0;

    const byModel: Record<string, number> = {};
    for (const r of requests) {
      byModel[r.model] = (byModel[r.model] ?? 0) + r.costUsd;
    }

    const adImpressions = requests.filter((r) => r.adId).length;
    const creditsEarned = (adImpressions / 1000) * 5.0 * 0.9;
    const creditFunded = requests.filter((r) => r.fundedByCredits).length;
    const totalSavings = requests
      .filter((r) => r.fundedByCredits)
      .reduce((s, r) => s + r.costUsd, 0);
    const costOffset = totalCost > 0 ? (creditsEarned / totalCost) * 100 : 0;

    // Time-bucketed data for charts
    const bucketMs =
      range === "24h"
        ? 60 * 60 * 1000 // 1 hour
        : range === "7d"
          ? 6 * 60 * 60 * 1000 // 6 hours
          : 24 * 60 * 60 * 1000; // 1 day

    const buckets: Record<
      number,
      { requests: number; cost: number; creditsEarned: number; creditsSpent: number; savings: number }
    > = {};

    for (const r of requests) {
      const bucket = Math.floor(r.createdAt / bucketMs) * bucketMs;
      if (!buckets[bucket]) {
        buckets[bucket] = { requests: 0, cost: 0, creditsEarned: 0, creditsSpent: 0, savings: 0 };
      }
      buckets[bucket].requests++;
      buckets[bucket].cost += r.costUsd;
      if (r.fundedByCredits) {
        buckets[bucket].creditsSpent += r.costUsd;
        buckets[bucket].savings += r.costUsd;
      }
      if (r.adId) {
        buckets[bucket].creditsEarned += (5.0 * 0.9) / 1000;
      }
    }

    const timeSeries = Object.entries(buckets)
      .map(([ts, data]) => ({ timestamp: Number(ts), ...data }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return {
      total,
      totalCost,
      cached,
      cacheHitRate,
      byModel,
      adImpressions,
      creditsEarned,
      creditFunded,
      totalSavings,
      costOffset,
      timeSeries,
    };
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
    fundedByCredits: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("requests", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
