<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Relay, a Next.js App Router application. The following changes were made across two sessions:

**Session 1 — Core integration:**

- **`instrumentation-client.ts`**: Initializes `posthog-js` for client-side analytics using the Next.js 15.3+ recommended approach, with reverse proxy support, exception capture, and debug mode in development.
- **`next.config.ts`**: Added `/ingest` reverse proxy rewrites to route PostHog events through the app's own domain, reducing ad-blocker interference.
- **`lib/posthog-server.ts`**: Server-side PostHog client singleton using `posthog-node`, configured with `flushAt: 1` and `flushInterval: 0` for immediate flushing in short-lived server functions.
- **`app/signin/page.tsx`**: User identification on successful sign-in/sign-up; captures `user_signed_in`, `user_signed_up`, and `sign_in_failed` events.
- **`components/api-key-form.tsx`**: Captures `api_key_saved`, `api_key_removed`, and `api_key_save_failed` events when users manage their AI provider keys.
- **`app/dashboard/settings/page.tsx`**: Captures `smart_routing_toggled`, `semantic_cache_toggled`, `ad_injection_toggled`, `context_prompt_saved`, and `fallback_provider_changed` events.
- **`app/api/[relayToken]/v1/chat/completions/route.ts`**: Server-side events for every stage of the AI proxy pipeline.

**Session 2 — Extended coverage:**

- **`components/proxy-url-card.tsx`**: Added `proxy_url_copied` and `relay_token_regenerated` events.
- **`components/UserMenu.tsx`**: Added `user_signed_out` event with `posthog.reset()` to clear identity on logout.
- **`app/dashboard/page.tsx`**: Added `dashboard_viewed` event (fires once per viewer load) for funnel tracking.
- **`components/splash-cta.tsx`** (new client component): Extracts CTA buttons from the server-rendered splash page to capture `get_started_clicked` event.
- **`app/(splash)/page.tsx`**: Updated to use new `SplashCta` client component.
- **`app/api/[relayToken]/v1/chat/completions/route.ts`**: Added `no_api_keys_error` and `insufficient_credits_error` server-side error events for churn risk detection.

## Events

| Event Name                   | Description                                                     | File                                                |
| ---------------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| `user_signed_up`             | User successfully creates a new account                         | `app/signin/page.tsx`                               |
| `user_signed_in`             | User successfully signs in                                      | `app/signin/page.tsx`                               |
| `sign_in_failed`             | Sign-in or sign-up attempt fails                                | `app/signin/page.tsx`                               |
| `api_key_saved`              | User saves an API key for a provider                            | `components/api-key-form.tsx`                       |
| `api_key_removed`            | User removes an API key for a provider                          | `components/api-key-form.tsx`                       |
| `api_key_save_failed`        | Saving an API key fails                                         | `components/api-key-form.tsx`                       |
| `smart_routing_toggled`      | User enables or disables smart routing                          | `app/dashboard/settings/page.tsx`                   |
| `semantic_cache_toggled`     | User enables or disables semantic cache                         | `app/dashboard/settings/page.tsx`                   |
| `ad_injection_toggled`       | User enables or disables sponsored ad injection                 | `app/dashboard/settings/page.tsx`                   |
| `context_prompt_saved`       | User saves their context injection system prompt                | `app/dashboard/settings/page.tsx`                   |
| `fallback_provider_changed`  | User changes their fallback AI provider                         | `app/dashboard/settings/page.tsx`                   |
| `chat_completion_requested`  | Server: relay token user makes a chat completion request        | `app/api/[relayToken]/v1/chat/completions/route.ts` |
| `chat_completion_succeeded`  | Server: successful completion with token usage and cost         | `app/api/[relayToken]/v1/chat/completions/route.ts` |
| `chat_completion_cache_hit`  | Server: cached response served instead of calling the LLM       | `app/api/[relayToken]/v1/chat/completions/route.ts` |
| `chat_completion_failed`     | Server: chat completion fails due to a provider error           | `app/api/[relayToken]/v1/chat/completions/route.ts` |
| `proxy_url_copied`           | User copies their Relay proxy URL to clipboard                  | `components/proxy-url-card.tsx`                     |
| `relay_token_regenerated`    | User regenerates their relay token, invalidating the old URL    | `components/proxy-url-card.tsx`                     |
| `user_signed_out`            | User signs out (also calls `posthog.reset()` to clear identity) | `components/UserMenu.tsx`                           |
| `dashboard_viewed`           | User views the main dashboard — top of the engagement funnel    | `app/dashboard/page.tsx`                            |
| `get_started_clicked`        | Visitor clicks the "Get started free" CTA on the splash page    | `components/splash-cta.tsx`                         |
| `no_api_keys_error`          | Server: proxy returns 402 — no API keys and no credits          | `app/api/[relayToken]/v1/chat/completions/route.ts` |
| `insufficient_credits_error` | Server: proxy returns 402 — pool key selected but zero credits  | `app/api/[relayToken]/v1/chat/completions/route.ts` |

## Next steps

We've built some insights and dashboards for you to keep an eye on user behavior, based on the events we just instrumented:

**Session 1 dashboard:**

- **Dashboard**: [Analytics basics (session 1)](https://us.posthog.com/project/319961/dashboard/1297943)
- **Insight**: [User Sign-ups & Sign-ins](https://us.posthog.com/project/319961/insights/rcf5mlzK)
- **Insight**: [Onboarding Funnel: Sign Up → API Key → Chat Request](https://us.posthog.com/project/319961/insights/2MzXIfG5)
- **Insight**: [Chat Completion Volume & Health](https://us.posthog.com/project/319961/insights/TEY0NwuT)
- **Insight**: [Feature Adoption: API Keys & Settings](https://us.posthog.com/project/319961/insights/ERNnUHdn)
- **Insight**: [Sign In Failures](https://us.posthog.com/project/319961/insights/QARsvztD)

**Session 2 dashboard:**

- **Dashboard**: [Analytics basics](https://us.posthog.com/project/319961/dashboard/1297993)
- **Insight**: [User Acquisition Funnel](https://us.posthog.com/project/319961/insights/4TVTFXRl) — get_started_clicked → signed_up → dashboard_viewed → api_key_saved → first completion
- **Insight**: [Chat Completion Volume](https://us.posthog.com/project/319961/insights/WndbwsEg) — Completions vs cache hits vs failures
- **Insight**: [User Sign-ups vs Sign-outs](https://us.posthog.com/project/319961/insights/wKbN5TN7) — Early churn indicator
- **Insight**: [Proxy 402 Errors (Churn Risk)](https://us.posthog.com/project/319961/insights/FmfcNzbu) — no_api_keys_error + insufficient_credits_error
- **Insight**: [Feature Engagement & Setup Actions](https://us.posthog.com/project/319961/insights/ffnJgRch) — Routing/cache/ads toggles + API key management

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
