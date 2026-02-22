import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Exact hash lookup
export const getByHash = query({
  args: {
    userId: v.id("users"),
    promptHash: v.string(),
  },
  handler: async (ctx, { userId, promptHash }) => {
    return ctx.db
      .query("cache")
      .withIndex("by_hash", (q) => q.eq("promptHash", promptHash))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
  },
});

export const store = mutation({
  args: {
    userId: v.id("users"),
    promptHash: v.string(),
    responseText: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    // Don't store if we already have an exact match
    const existing = await ctx.db
      .query("cache")
      .withIndex("by_hash", (q) => q.eq("promptHash", args.promptHash))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    if (existing) return;
    await ctx.db.insert("cache", { ...args, createdAt: Date.now() });
  },
});
