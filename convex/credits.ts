import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireProxySecret } from "./auth.helpers";

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

// Proxy: check balance by userId
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

const CREDIT_SPLIT = 0.9;

// Earn credits from an ad impression (proxy-only, requires secret)
export const earnFromAd = mutation({
  args: {
    userId: v.id("users"),
    adId: v.string(),
    proxySecret: v.string(),
  },
  handler: async (ctx, { userId, adId, proxySecret }) => {
    requireProxySecret(proxySecret);
    // Look up actual ad CPM from database — never trust caller-supplied values
    const normalizedId = ctx.db.normalizeId("ads", adId);
    if (!normalizedId) return 0;
    const ad = await ctx.db.get(normalizedId);
    if (!ad || !ad.active) return 0;
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!settings) return 0;
    const earned = (ad.cpm * CREDIT_SPLIT) / 1000;
    await ctx.db.patch(settings._id, {
      credits: (settings.credits ?? 0) + earned,
    });
    return earned;
  },
});

// Spend credits when using adllm pool key (proxy-only, requires secret)
export const spend = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    proxySecret: v.string(),
  },
  handler: async (ctx, { userId, amount, proxySecret }) => {
    requireProxySecret(proxySecret);
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
