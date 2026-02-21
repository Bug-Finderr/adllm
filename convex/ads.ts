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
      { sponsor: "Vercel", pitch: "Deploy your frontend instantly. Zero config, infinite scale.", url: "vercel.com/new", cpm: 5.0 },
      { sponsor: "Convex", pitch: "The reactive backend for AI apps. Real-time, serverless, TypeScript-native.", url: "convex.dev", cpm: 4.5 },
      { sponsor: "Supabase", pitch: "Open source Firebase alternative. Postgres, Auth, Storage, Realtime.", url: "supabase.com", cpm: 4.0 },
      { sponsor: "Cursor", pitch: "The AI-native code editor. Write code faster with built-in AI.", url: "cursor.com", cpm: 6.0 },
      { sponsor: "Railway", pitch: "Deploy anything. Databases, cron jobs, and apps in seconds.", url: "railway.app", cpm: 3.5 },
    ];

    for (const ad of defaults) {
      await ctx.db.insert("ads", { ...ad, active: true });
    }
  },
});
