import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    // Never return the encrypted key to the client
    return keys.map(({ encryptedKey: _enc, iv: _iv, ...rest }) => rest);
  },
});

export const upsert = mutation({
  args: {
    provider: v.union(
      v.literal("anthropic"),
      v.literal("openai"),
      v.literal("google"),
    ),
    encryptedKey: v.string(),
    iv: v.string(),
    keyPreview: v.string(),
  },
  handler: async (ctx, { provider, encryptedKey, iv, keyPreview }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", userId).eq("provider", provider),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedKey,
        iv,
        keyPreview,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert("apiKeys", {
        userId,
        provider,
        encryptedKey,
        iv,
        keyPreview,
        createdAt: Date.now(),
      });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("apiKeys") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const key = await ctx.db.get(id);
    if (!key || key.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

// Returns just the provider names the user has configured (no keys)
export const getAvailableProviders = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return keys.map((k) => k.provider);
  },
});

// Internal: get encrypted key for a provider (used by proxy via HTTP action)
export const getEncryptedForProvider = query({
  args: {
    userId: v.id("users"),
    provider: v.union(
      v.literal("anthropic"),
      v.literal("openai"),
      v.literal("google"),
    ),
  },
  handler: async (ctx, { userId, provider }) => {
    const key = await ctx.db
      .query("apiKeys")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", userId).eq("provider", provider),
      )
      .first();
    if (!key) return null;
    return { encryptedKey: key.encryptedKey, iv: key.iv };
  },
});
