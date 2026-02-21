import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Dashboard: get current user's credit balance
export const getBalance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    return settings?.credits ?? 0;
  },
});

// Proxy: check balance by userId (no auth context needed)
export const checkBalance = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    return settings?.credits ?? 0;
  },
});

// Earn credits from an ad impression: 90% of CPM / 1000
export const earnFromAd = mutation({
  args: {
    userId: v.id("users"),
    adId: v.string(),
    cpm: v.number(),
  },
  handler: async (ctx, { userId, cpm }) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!settings) return 0;
    const earned = (cpm * 0.9) / 1000;
    await ctx.db.patch(settings._id, {
      credits: (settings.credits ?? 0) + earned,
    });
    return earned;
  },
});

// Spend credits when using Relay pool key
export const spend = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, { userId, amount }) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!settings) throw new Error("Settings not found");
    const current = settings.credits ?? 0;
    if (current < amount) throw new Error("Insufficient credits");
    await ctx.db.patch(settings._id, { credits: current - amount });
  },
});
