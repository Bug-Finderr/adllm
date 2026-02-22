import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("ads").collect();
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("ads")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
  },
});

export const create = mutation({
  args: {
    sponsor: v.string(),
    pitch: v.string(),
    url: v.string(),
    cpm: v.number(),
    format: v.optional(v.union(v.literal("badge"), v.literal("text"))),
    logoSlug: v.optional(v.string()),
    badgeColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("ads", { ...args, active: true });
  },
});

export const remove = mutation({
  args: { id: v.id("ads") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("ads"), active: v.boolean() },
  handler: async (ctx, { id, active }) => {
    await ctx.db.patch(id, { active });
  },
});

// Seed initial ads for demo
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("ads").collect();
    if (existing.length > 0) return; // already seeded

    const defaults = [
      // Badge format (shields.io with logos)
      { sponsor: "Vercel", pitch: "Deploy instantly, scale infinitely.", url: "vercel.com/new", cpm: 5.0, format: "badge" as const, logoSlug: "vercel", badgeColor: "000" },
      { sponsor: "Supabase", pitch: "Open source Firebase alternative. Postgres, Auth, Realtime.", url: "supabase.com", cpm: 4.0, format: "badge" as const, logoSlug: "supabase", badgeColor: "3ECF8E" },
      { sponsor: "Cursor", pitch: "The AI-native code editor. Ship faster with built-in AI.", url: "cursor.com", cpm: 6.0, format: "badge" as const, logoSlug: "cursor", badgeColor: "000" },
      // Text format (clean italic single-line)
      { sponsor: "Convex", pitch: "The reactive backend for AI apps. Real-time, serverless, TypeScript-native.", url: "convex.dev", cpm: 4.5, format: "text" as const },
      { sponsor: "Railway", pitch: "Deploy anything. Databases, cron jobs, and apps in seconds.", url: "railway.app", cpm: 3.5, format: "text" as const },
    ];

    for (const ad of defaults) {
      await ctx.db.insert("ads", { ...ad, active: true });
    }
  },
});
