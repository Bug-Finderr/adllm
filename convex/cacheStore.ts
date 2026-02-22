import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireProxySecret } from "./auth.helpers";

// Exact hash lookup
export const getByHash = query({
  args: {
    userId: v.id("users"),
    promptHash: v.string(),
  },
  handler: async (ctx, { userId, promptHash }) => {
    return ctx.db
      .query("cache")
      .withIndex("by_user_hash", (q) =>
        q.eq("userId", userId).eq("promptHash", promptHash),
      )
      .first();
  },
});

export const store = mutation({
  args: {
    userId: v.id("users"),
    promptHash: v.string(),
    responseText: v.string(),
    model: v.string(),
    proxySecret: v.string(),
  },
  handler: async (ctx, { proxySecret, ...args }) => {
    requireProxySecret(proxySecret);
    // Don't store if we already have an exact match
    const existing = await ctx.db
      .query("cache")
      .withIndex("by_user_hash", (q) =>
        q.eq("userId", args.userId).eq("promptHash", args.promptHash),
      )
      .first();
    if (existing) return;
    await ctx.db.insert("cache", { ...args, createdAt: Date.now() });
  },
});
