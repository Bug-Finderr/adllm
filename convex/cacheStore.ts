import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Exact hash lookup (free, no embedding cost)
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

export const getById = query({
  args: { id: v.id("cache") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const store = mutation({
  args: {
    userId: v.id("users"),
    promptHash: v.string(),
    embedding: v.array(v.float64()),
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

export const clear = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const all = await ctx.db
      .query("cache")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(all.map((c) => ctx.db.delete(c._id)));
  },
});

export const getCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const all = await ctx.db
      .query("cache")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return all.length;
  },
});
