# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev                    # Start both Next.js + Convex dev servers (via mprocs)
bun run dev:frontend       # Next.js only (with --turbopack)
bun run dev:convex         # Convex only (bunx convex dev)
bun run build              # Next.js production build
bun run lint               # ESLint
bunx convex deploy         # Deploy Convex functions to production
bunx convex run ads:seed   # Seed default ads into database
```

Always use `bun` / `bunx` — never npm, npx, pnpm, or yarn.

## Critical Guidelines

- **Never run**: tests, build, lint, or compile/transpile commands
- **Rely on IDE**: Use IDE integrations (diagnostics, type checking) to detect code issues
- **Web search first**: Always search for latest documentation and reliable context before implementing
- **Stay focused**: Ignore issues not related to the current task
- **Minimal code**: Prioritize best practices with minimal, clean code

## Architecture

### Core: The Proxy Route

`app/api/[relayToken]/v1/chat/completions/route.ts` — Edge Runtime, OpenAI-compatible endpoint.

**Pipeline**: Auth by relay token → ad selection → context injection → cache check → smart routing (Gemini Flash classifies complexity) → resolve API key (user's own → pool key w/ credits) → stream via AI SDK 6 → log request + earn/spend credits → return SSE stream with ad appended.

IDEs (Cursor, VS Code, Continue.dev) point at `https://relay.vercel.app/api/{relayToken}/v1` and it Just Works as an OpenAI-compatible API.

### Dual Auth Model

1. **Dashboard auth** — Convex Auth with Password provider. Session cookie. Protects `/dashboard/*`.
2. **Proxy auth** — `relayToken` (random hex) embedded in the URL path. No session needed. IDEs send requests with just the URL.

These are completely separate auth mechanisms for different use cases.

### Convex Backend

All backend logic lives in `convex/`. Key modules:

- `schema.ts` — 6 tables: apiKeys, requests, cache, ads, settings, + authTables
- `settings.ts` — Per-user config (relay token, routing/cache/ads toggles, credits, system prompt)
- `apiKeys.ts` — Encrypted API key CRUD (AES-GCM, encrypted client-side before storage)
- `requests.ts` — Request logging + `getStats` / `getHistoricalStats` (time-bucketed analytics)
- `credits.ts` — Credit balance, earnFromAd (applies hidden 90% factor), spend
- `cacheStore.ts` — Hash-based exact cache lookup (vector index defined but not yet used for similarity)
- `ads.ts` — Sponsored ad CRUD + seed

**Convex from Edge Runtime**: The proxy route can't use Convex hooks — it uses `fetchQuery` and `fetchMutation` from `convex/nextjs` for direct server-side calls. Mutations after response (logging, credit ops) are fire-and-forget with `.catch(console.error)`.

### Smart Routing (`lib/routing.ts`)

Gemini Flash classifies the prompt's first 300 chars as simple/medium/complex. Each tier has a preference order of providers — picks the first one the user has a key for. Known model names (gpt-4o, claude-sonnet-4-5, etc.) bypass classification and route directly via `MODEL_PROVIDER_MAP`.

### API Key Encryption (`lib/encryption.ts`)

AES-GCM 256-bit. Key derived from `NEXT_PUBLIC_ENCRYPTION_KEY` (64-char hex). Encryption happens in the browser via Web Crypto API. Only the encrypted blob + IV are stored in Convex. Decrypted at request time in the Edge runtime.

### Pool Key Fallback (Credit System)

When a user lacks their own API key for a provider but has credits > 0, the proxy falls back to Relay's pool keys (env vars: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`). Cost is deducted from the user's credit balance. If no key and no credits → 402.

## Ad-Funded Credits (INTERNAL — never expose to users)

- Ads are injected into chat responses as SSE chunks before `data: [DONE]`.
- **The 90/10 revenue split (90% to user credits, 10% Relay profit) is an internal business model detail. Never show percentages, splits, or profit margins in the UI.**
- Users see: "Earn free credits from sponsored content" — they do NOT see how the revenue is divided.
- The `earnFromAd` mutation applies the 90% factor internally. This is invisible to the user.

## Stack

- Next.js 16 App Router + Vercel (Edge Runtime for proxy)
- Convex (backend, real-time reactive queries, vector search index)
- Convex Auth (Password provider — not Clerk)
- AI SDK 6 (`streamText` from `ai`, provider packages `@ai-sdk/{openai,anthropic,google}`)
- shadcn/ui + Tailwind v4 + recharts
- PostHog analytics (client: `instrumentation-client.ts`, server: `lib/posthog-server.ts`, reverse proxy via Next.js rewrites to `/ingest/*`)
- bun as package manager

## Non-Obvious Patterns

- **Tailwind v4**: Uses `@tailwindcss/postcss` plugin, not the older `tailwindcss` PostCSS plugin. `darkMode: ["selector", ".dark"]` in config.
- **PostHog on Edge**: Instantiated per-request with `flushAt: 1, flushInterval: 0` for serverless.
- **SSE ad injection**: Ads sent as additional OpenAI-compatible delta chunks (`data: {"choices":[{"delta":{"content":"..."}}]}`) before `data: [DONE]`.
- **Convex `v.optional()` for migrations**: New schema fields use `v.optional()` so existing documents aren't broken.
- **Cost table in proxy route**: Token costs are estimated with a hardcoded `MODEL_COSTS` map (per-million-token rates).

## A Note To The Agent

We are building this together. When you learn something non-obvious, add it here so future changes go faster.
