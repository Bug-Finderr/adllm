# AdLLM: Ad-Funded AI Proxy for Coding Assistants

**Your AI coding costs, subsidized by ads.**

adllm is a BYOK (Bring Your Own Key) AI proxy for coding assistants. Point your IDE at your adllm endpoint and every AI response includes a small sponsored message — earning you credits that pay for future requests. The more you code, the less you pay.

## The Idea

LLM API costs add up fast when you're coding all day. adllm inserts a one-line sponsor message at the end of each AI response (like a podcast ad read, but for your IDE). Those impressions earn you credits that fund requests through adllm's pooled API keys — so you spend less of your own money.

```
You:  "How do I center a div?"

AI:   "Use flexbox: display: flex; align-items: center; justify-content: center;"

      ---
      > *Sponsored by Vercel* — Deploy instantly, scale infinitely.
```

That one impression just earned you credits toward your next request.

## How It Works

```
IDE (Cursor / VS Code / Continue.dev / JetBrains AI)
  │
  ▼
adllm.vercel.app/api/{your-token}/v1   ← OpenAI-compatible endpoint
  │
  ├─ Rate limit (Upstash Redis, 60 req/min)
  ├─ Context injection (your system prompt prepended)
  ├─ Cache check (SHA-256 hash → instant $0 response)
  ├─ Smart routing (Gemini Flash classifies complexity → cheapest model)
  ├─ Key resolution (pool key with credits → your own key as fallback)
  └─ Stream response + append sponsored ad → SSE back to IDE
```

## Features

- **Ad-Funded Credits** — Sponsored messages earn you credits. Credits fund requests through adllm's pool keys. You see exactly how much you saved in the dashboard.
- **Smart Routing** — Gemini Flash classifies prompts as simple/medium/complex and routes to the cheapest capable model. Simple questions go to Gemini Flash ($0.075/MTok), complex ones to Claude Sonnet.
- **Prompt Cache** — Identical prompts return cached responses instantly at $0 cost (SHA-256 hash match).
- **Context Injection** — Set a system prompt once in the dashboard. Every request gets it automatically.
- **Real-Time Dashboard** — Live request log, cost tracking, cache hit rates, usage charts, and savings metrics — all reactive via Convex.
- **BYOK Encryption** — API keys are AES-256-GCM encrypted server-side via a Next.js server action. Only the encrypted blob + IV are stored. Decrypted in-memory at request time.

## Quick Start

### Prerequisites

- [bun](https://bun.sh) (package manager + runtime)
- A [Convex](https://convex.dev) account
- At least one LLM API key (OpenAI, Anthropic, or Google)

### Setup

```bash
bun install
bun dev            # Starts Next.js + Convex dev servers
bunx convex run ads:seed   # Seed demo ads (one-time)
```

### Connect Your IDE

1. Sign up at the dashboard and add your API keys
2. Copy your unique proxy URL from the dashboard
3. In your IDE, set the API base URL to your proxy URL

Works with any OpenAI-compatible client — Cursor, VS Code Copilot, Continue.dev, JetBrains AI, Cline, or `curl`.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 App Router, React 19, shadcn/ui, Tailwind v4, recharts |
| Backend | Convex (real-time DB, server functions, auth) |
| Auth | Convex Auth (Password provider) |
| AI | AI SDK 6, Gemini Flash (classifier), multi-provider streaming |
| Proxy | Vercel Edge Runtime, SSE streaming |
| Security | AES-256-GCM encryption, Upstash Redis rate limiting, proxy secret auth |
| Analytics | PostHog (reverse proxied) |

## Project Structure

```
app/
  api/[relayToken]/v1/chat/completions/  ← The proxy (Edge Runtime)
  actions/encrypt-key.ts                 ← Server action for key encryption
  dashboard/                             ← Real-time analytics UI
  dashboard/settings/                    ← API keys, routing, cache config
  signin/                                ← Auth page
convex/
  schema.ts        ← 6 tables: apiKeys, requests, cache, ads, settings, + auth
  settings.ts      ← Per-user config + relay token
  apiKeys.ts       ← Encrypted key CRUD
  requests.ts      ← Request logging + time-bucketed stats
  credits.ts       ← Credit balance, earn from ads, spend on requests
  cacheStore.ts    ← SHA-256 hash-based cache lookup
  ads.ts           ← Sponsored ad queries + seed
  auth.helpers.ts  ← Proxy secret validation
lib/
  routing.ts       ← Smart routing (classify + route)
  encryption.ts    ← AES-GCM encrypt/decrypt (Web Crypto)
  ads.ts           ← Ad formatting + sanitization
```
