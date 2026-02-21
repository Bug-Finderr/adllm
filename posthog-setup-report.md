<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Relay, a Next.js App Router application. The following changes were made:

- **`instrumentation-client.ts`** (new): Initializes `posthog-js` for client-side analytics using the Next.js 15.3+ recommended approach, with reverse proxy support, exception capture, and debug mode in development.
- **`next.config.ts`** (updated): Added `/ingest` reverse proxy rewrites to route PostHog events through the app's own domain, reducing ad-blocker interference.
- **`lib/posthog-server.ts`** (new): Server-side PostHog client singleton using `posthog-node`, configured with `flushAt: 1` and `flushInterval: 0` for immediate flushing in short-lived server functions.
- **`app/signin/page.tsx`** (updated): User identification on successful sign-in/sign-up; captures `user_signed_in`, `user_signed_up`, and `sign_in_failed` events.
- **`components/api-key-form.tsx`** (updated): Captures `api_key_saved`, `api_key_removed`, and `api_key_save_failed` events when users manage their AI provider keys.
- **`app/dashboard/settings/page.tsx`** (updated): Captures `smart_routing_toggled`, `semantic_cache_toggled`, `ad_injection_toggled`, `context_prompt_saved`, and `fallback_provider_changed` events.
- **`app/api/[relayToken]/v1/chat/completions/route.ts`** (updated): Server-side events for every stage of the AI proxy pipeline using `posthog-node`'s edge-compatible entrypoint.

## Events

| Event Name | Description | File |
|---|---|---|
| `user_signed_up` | User successfully creates a new account | `app/signin/page.tsx` |
| `user_signed_in` | User successfully signs in | `app/signin/page.tsx` |
| `sign_in_failed` | Sign-in or sign-up attempt fails | `app/signin/page.tsx` |
| `api_key_saved` | User saves an API key for a provider | `components/api-key-form.tsx` |
| `api_key_removed` | User removes an API key for a provider | `components/api-key-form.tsx` |
| `api_key_save_failed` | Saving an API key fails | `components/api-key-form.tsx` |
| `smart_routing_toggled` | User enables or disables smart routing | `app/dashboard/settings/page.tsx` |
| `semantic_cache_toggled` | User enables or disables semantic cache | `app/dashboard/settings/page.tsx` |
| `ad_injection_toggled` | User enables or disables sponsored ad injection | `app/dashboard/settings/page.tsx` |
| `context_prompt_saved` | User saves their context injection system prompt | `app/dashboard/settings/page.tsx` |
| `fallback_provider_changed` | User changes their fallback AI provider | `app/dashboard/settings/page.tsx` |
| `chat_completion_requested` | Server: relay token user makes a chat completion request | `app/api/[relayToken]/v1/chat/completions/route.ts` |
| `chat_completion_succeeded` | Server: successful completion with token usage and cost | `app/api/[relayToken]/v1/chat/completions/route.ts` |
| `chat_completion_cache_hit` | Server: cached response served instead of calling the LLM | `app/api/[relayToken]/v1/chat/completions/route.ts` |
| `chat_completion_failed` | Server: chat completion fails due to a provider error | `app/api/[relayToken]/v1/chat/completions/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard**: [Analytics basics](https://us.posthog.com/project/319961/dashboard/1297943)
- **Insight**: [User Sign-ups & Sign-ins](https://us.posthog.com/project/319961/insights/rcf5mlzK) — Daily unique users signing up and signing in
- **Insight**: [Onboarding Funnel: Sign Up → API Key → Chat Request](https://us.posthog.com/project/319961/insights/2MzXIfG5) — Key activation conversion funnel
- **Insight**: [Chat Completion Volume & Health](https://us.posthog.com/project/319961/insights/TEY0NwuT) — Requests, successes, cache hits, and failures
- **Insight**: [Feature Adoption: API Keys & Settings](https://us.posthog.com/project/319961/insights/ERNnUHdn) — How users configure Relay
- **Insight**: [Sign In Failures](https://us.posthog.com/project/319961/insights/QARsvztD) — Authentication friction signal

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
