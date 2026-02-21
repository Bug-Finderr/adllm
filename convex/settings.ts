import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function generateToken(): string {
  // 32 random hex chars
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const getOrCreate = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) return existing;
    const newSettings = await ctx.db.insert("settings", {
      userId,
      relayToken: generateToken(),
      routingEnabled: true,
      cacheEnabled: true,
      systemPromptAddition: "",
      preferredProvider: "anthropic",
    });
    return ctx.db.get(newSettings);
  },
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

export const update = mutation({
  args: {
    routingEnabled: v.optional(v.boolean()),
    cacheEnabled: v.optional(v.boolean()),
    systemPromptAddition: v.optional(v.string()),
    preferredProvider: v.optional(
      v.union(
        v.literal("anthropic"),
        v.literal("openai"),
        v.literal("google"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!settings) throw new Error("Settings not found");
    await ctx.db.patch(settings._id, args);
  },
});

export const regenerateToken = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!settings) throw new Error("Settings not found");
    await ctx.db.patch(settings._id, { relayToken: generateToken() });
  },
});

// Used by proxy route to look up user by relay token
export const getByToken = query({
  args: { relayToken: v.string() },
  handler: async (ctx, { relayToken }) => {
    return ctx.db
      .query("settings")
      .withIndex("by_relayToken", (q) => q.eq("relayToken", relayToken))
      .first();
  },
});
