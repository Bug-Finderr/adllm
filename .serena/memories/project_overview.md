# AdLLM Project Overview

## Purpose
Ad-funded BYOK AI proxy. Users point their IDE at the proxy URL, get smart routing + prompt caching + context injection + ad-funded credits + real-time dashboard.

## Tech Stack
- Next.js 16 App Router + Vercel (Edge Runtime for proxy)
- Convex (backend, real-time reactive queries, auth)
- AI SDK 6 (streamText, provider packages)
- shadcn/ui + Tailwind v4 + recharts
- PostHog analytics
- bun as package manager (NEVER npm/npx)

## Key Commands
- `bun dev` — Start both Next.js + Convex dev servers
- `bun run build` — Next.js production build
- `bun run lint` — Biome check + autofix
- NEVER run tests, build, lint, or compile commands per CLAUDE.md
- Use serena and MCP tools for type checking and diagnostics

## Code Style
- TypeScript strict mode
- Biome for linting/formatting
- No docstrings/comments unless logic is non-obvious
- `v.optional()` for new Convex schema fields (backwards-compat)

## Structure
- `app/` — Next.js App Router pages and API routes
- `convex/` — Convex backend (schema, mutations, queries)
- `components/` — React components (shadcn/ui based)
- `lib/` — Shared utilities (models, routing, encryption, ads)
- Core proxy: `app/api/[relayToken]/v1/chat/completions/route.ts`
