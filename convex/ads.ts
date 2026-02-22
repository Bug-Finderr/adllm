import { mutation, query } from "./_generated/server";

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("ads")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
  },
});

// Seed initial ads for demo
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("ads").collect();
    if (existing.length > 0) return; // already seeded

    const defaults = [
      {
        sponsor: "Vercel",
        pitch: "Deploy instantly, scale infinitely.",
        url: "vercel.com/new",
        cpm: 5.0,
      },
      {
        sponsor: "Supabase",
        pitch: "Open source Firebase alternative. Postgres, Auth, Realtime.",
        url: "supabase.com",
        cpm: 4.0,
      },
      {
        sponsor: "Cursor",
        pitch: "The AI-native code editor. Ship faster with built-in AI.",
        url: "cursor.com",
        cpm: 6.0,
      },
      {
        sponsor: "Convex",
        pitch:
          "The reactive backend for AI apps. Real-time, serverless, TypeScript-native.",
        url: "convex.dev",
        cpm: 4.5,
      },
      {
        sponsor: "Railway",
        pitch: "Deploy anything. Databases, cron jobs, and apps in seconds.",
        url: "railway.app",
        cpm: 3.5,
      },
    ];

    for (const ad of defaults) {
      await ctx.db.insert("ads", { ...ad, active: true });
    }
  },
});
