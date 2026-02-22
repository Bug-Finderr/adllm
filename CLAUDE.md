# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev                    # Start both Next.js + Convex dev servers (via mprocs)
bun run dev:frontend       # Next.js only (with --turbopack)
bun run dev:convex         # Convex only (bunx convex dev)
bun run build              # Next.js production build
bun run lint               # Biome check + autofix
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

**Pipeline**: Rate limit (Upstash Redis) → auth by relay token → ad selection → context injection → cache check (SHA-256) → smart routing (Gemini Flash classifies complexity) → resolve API key (pool key w/ credits → user's own as fallback) → stream via AI SDK 6 → log request + earn/spend credits → return SSE stream with ad appended.

### Dual Auth Model

1. **Dashboard auth** — Convex Auth with Password provider. Session cookie. Protects `/dashboard/*`.
2. **Proxy auth** — `relayToken` (random hex) embedded in the URL path. No session needed. IDEs send requests with just the URL.
3. **Mutation auth** — `PROXY_SECRET` shared between Next.js env and Convex env. All write mutations (`earnFromAd`, `spend`, `requests.log`, `cacheStore.store`) validate this secret to prevent direct client SDK abuse.

### Convex Backend

All backend logic lives in `convex/`. Key modules:

- `schema.ts` — 6 tables: apiKeys, requests, cache, ads, settings, + authTables
- `settings.ts` — Per-user config (relay token, routing/cache/ads toggles, system prompt, credit balance)
- `apiKeys.ts` — Encrypted API key CRUD (AES-GCM, encrypted server-side via server action)
- `requests.ts` — Request logging + `getStats` / `getHistoricalStats` (time-bucketed analytics)
- `credits.ts` — Credit balance queries, `earnFromAd` (looks up ad CPM from DB, applies 90% split), `spend`
- `cacheStore.ts` — SHA-256 hash-based exact cache lookup
- `ads.ts` — Sponsored ad CRUD + seed
- `auth.helpers.ts` — `requireProxySecret()` shared validation helper

**Convex from Edge Runtime**: The proxy route uses `fetchQuery` and `fetchMutation` from `convex/nextjs` for direct server-side calls. Mutations after response (logging, credit ops) are fire-and-forget with `.catch(console.error)`.

### Smart Routing (`lib/routing.ts`)

Gemini Flash classifies the prompt's first 300 chars as simple/medium/complex. Each tier has a preference order of providers — picks the first one the user has a key for. Known model names (gpt-4o, claude-sonnet-4-5, etc.) bypass classification and route directly via `MODEL_PROVIDER_MAP`.

### API Key Encryption (`lib/encryption.ts`)

AES-GCM 256-bit. Key from `ENCRYPTION_KEY` env var (64-char hex, server-side only). Encryption happens via a Next.js server action (`app/actions/encrypt-key.ts`). Only the encrypted blob + IV are stored in Convex. Decrypted at request time in the Edge runtime.

### Security

- **Encryption key server-side only**: `ENCRYPTION_KEY` (no `NEXT_PUBLIC_` prefix) — never shipped to browser.
- **Proxy secret**: All Convex write mutations require `PROXY_SECRET`. Set in both Next.js `.env.local` and Convex env (`bunx convex env set`).
- **Rate limiting**: Upstash Redis sliding window (60 req/min per relay token). Gracefully degrades if env vars not set.
- **Cache hash**: SHA-256 via `crypto.subtle.digest`. Includes system prompt + model + user messages.
- **Error sanitization**: Provider errors are redacted (API keys stripped) before returning to clients.
- **Ad sanitization**: Ad `sponsor`/`pitch` fields are stripped of newlines and markdown control chars. URLs are validated.

### Pool Key Priority (Credit System)

When a user has credits > 0, the proxy **prefers adllm's pool keys** (env vars: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`) over the user's own keys. A cost pre-check estimates whether credits cover the request; if not, it falls back to the user's own key. Cost is deducted after streaming. No pool key + no user key + no credits → 402.

## Ad-Funded Credits (INTERNAL — never expose to users)

- Ads are injected into chat responses as SSE chunks before `data: [DONE]`.
- **The 90/10 revenue split (90% to user credits, 10% adllm profit) is an internal business model detail. Never show percentages, splits, or profit margins in the UI.**
- Users see: "Earn free credits from sponsored content" — they do NOT see how the revenue is divided.
- The `earnFromAd` mutation applies the 90% factor internally. This is invisible to the user.

## Stack

- Next.js 16 App Router + Vercel (Edge Runtime for proxy)
- Convex (backend, real-time reactive queries)
- Convex Auth (Password provider — not Clerk)
- AI SDK 6 (`streamText` from `ai`, provider packages `@ai-sdk/{openai,anthropic,google}`)
- shadcn/ui + Tailwind v4 + recharts
- PostHog analytics (client: `instrumentation-client.ts`, reverse proxy via Next.js rewrites to `/ingest/*`)
- bun as package manager

## Non-Obvious Patterns

- **Tailwind v4**: Uses `@tailwindcss/postcss` plugin. `darkMode: ["selector", ".dark"]` in config.
- **PostHog on Edge**: Instantiated per-request with `flushAt: 1, flushInterval: 0` for serverless.
- **SSE ad injection**: Ads sent as additional OpenAI-compatible delta chunks before `data: [DONE]`.
- **Convex `v.optional()` for migrations**: New schema fields use `v.optional()` so existing documents aren't broken.
- **Cost table in proxy route**: Token costs estimated with a hardcoded `MODEL_COSTS` map (per-million-token rates).
- **`convex/env.d.ts`**: Ambient type declaration for `process.env` — required because Convex's bundler doesn't include `@types/node`.

## A Note To The Agent

We are building this together. When you learn something non-obvious, add it here so future changes go faster.
