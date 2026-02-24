import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { type LanguageModel, streamText } from "ai";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { PostHog } from "posthog-node";
import { api } from "@/convex/_generated/api";
import { type Ad, formatAdMarkdown, pickAd } from "@/lib/ads";
import { decrypt } from "@/lib/encryption";
import { bareModelId, modelProvider, type Provider } from "@/lib/models";
import { classifyAndRoute, ROUTING_PREFERENCES } from "@/lib/routing";

const CREDIT_SPLIT = 0.9;
const PROXY_SECRET = process.env.PROXY_SECRET ?? "";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Rate limiter: 60 requests per minute per relay token (requires Upstash Redis)
const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        }),
        limiter: Ratelimit.slidingWindow(60, "1 m"),
        analytics: true,
      })
    : null;

function getPostHog() {
  return new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
}

type Message = { role: "user" | "assistant" | "system"; content: string };

interface OpenAIRequest {
  model?: string;
  messages: Message[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

async function computeHash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function extractUserText(messages: Message[]): string {
  const userMessages = messages.filter((m) => m.role === "user");
  return userMessages
    .map((m) => m.content)
    .join(" ")
    .trim();
}

const POOL_KEY_MAP: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GEMINI_API_KEY",
};

// Derive default model per provider from medium-tier routing preferences
const DEFAULT_MODEL_FOR_PROVIDER: Record<string, string> = Object.fromEntries(
  ROUTING_PREFERENCES.medium.map((p) => [p.provider, p.model]),
);

// Model cost maps — populated from DB at request time
let modelInputCost: Record<string, number> = {};
let modelOutputCost: Record<string, number> = {};

function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const inRate = modelInputCost[model] ?? 1.0;
  const outRate = modelOutputCost[model] ?? 1.0;
  return (inputTokens * inRate + outputTokens * outRate) / 1_000_000;
}

function safeErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Unknown error";
  // Strip anything that looks like an API key (sk-..., AIza..., etc.)
  return msg.replace(
    /\b(sk-[a-zA-Z0-9_-]{10,}|AIza[a-zA-Z0-9_-]{10,}|Bearer\s+\S+)\b/g,
    "[REDACTED]",
  );
}

function makeOpenAIChunk(
  content: string,
  model: string,
  finishReason: string | null = null,
): string {
  return JSON.stringify({
    id: `chatcmpl-relay-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: content ? { content } : {},
        finish_reason: finishReason,
      },
    ],
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ relayToken: string }> },
) {
  const start = Date.now();
  const { relayToken } = await params;

  // 0. Rate limit check
  if (ratelimit) {
    const { success, limit, remaining, reset } =
      await ratelimit.limit(relayToken);
    if (!success) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
          },
        },
      );
    }
  }

  // 1. Look up user by relay token
  const settings = await fetchQuery(api.settings.getByToken, { relayToken });
  if (!settings) {
    return new Response(JSON.stringify({ error: "Invalid relay token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = settings.userId;
  const ph = getPostHog();

  // 0b. Load model catalog from DB (Convex caches this query)
  const allModels = await fetchQuery(api.models.list, {});
  // Build lookup maps: bare model name → { provider, bareId }
  const modelByBareId: Record<string, { provider: string; bareId: string }> =
    {};
  modelInputCost = {};
  modelOutputCost = {};
  for (const m of allModels) {
    const bare = bareModelId(m.modelId);
    modelByBareId[bare] = { provider: m.provider, bareId: bare };
    modelInputCost[bare] = m.inputCostPer1MTokens;
    modelOutputCost[bare] = m.outputCostPer1MTokens;
  }

  // Track the incoming request server-side
  ph.capture({
    distinctId: userId,
    event: "chat_completion_requested",
    properties: { relay_token_prefix: relayToken.slice(0, 6) },
  });

  // 1a. Pick ad if enabled
  let ad: Ad | null = null;
  if (settings.adsEnabled !== false) {
    const activeAds = await fetchQuery(api.ads.listActive, {});
    ad = pickAd(activeAds as Ad[]);
  }

  // 1b. Load which providers the user has API keys for + check credit balance
  const availableProviders = await fetchQuery(
    api.apiKeys.getAvailableProviders,
    { userId },
  );
  const creditBalance = await fetchQuery(api.credits.checkBalance, { userId });

  if (availableProviders.length === 0 && creditBalance <= 0) {
    ph.capture({
      distinctId: userId,
      event: "no_api_keys_error",
      properties: { credit_balance: creditBalance },
    });
    ph.shutdown().catch(() => {});
    return new Response(
      JSON.stringify({
        error:
          "No API keys configured and no credits available. Add a key or enable ads to earn credits.",
      }),
      { status: 402, headers: { "Content-Type": "application/json" } },
    );
  }

  const routingProviders: ("anthropic" | "openai" | "google")[] = [];
  if (creditBalance > 0) {
    for (const [prov, envKey] of Object.entries(POOL_KEY_MAP)) {
      if (process.env[envKey]) {
        routingProviders.push(prov as "anthropic" | "openai" | "google");
      }
    }
  }
  for (const prov of availableProviders) {
    if (!routingProviders.includes(prov as "anthropic" | "openai" | "google")) {
      routingProviders.push(prov as "anthropic" | "openai" | "google");
    }
  }

  // 2. Parse request
  let body: OpenAIRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, model: requestedModel = "auto" } = body;
  if (!messages?.length) {
    return new Response(JSON.stringify({ error: "messages required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Context injection — prepend user's system prompt
  let processedMessages = [...messages];
  if (settings.systemPromptAddition?.trim()) {
    const addition = `[adllm Context]\n${settings.systemPromptAddition.trim()}\n`;
    const existingSystem = processedMessages.find((m) => m.role === "system");
    if (existingSystem) {
      processedMessages = processedMessages.map((m) =>
        m.role === "system"
          ? { ...m, content: `${addition}\n${m.content}` }
          : m,
      );
    } else {
      processedMessages = [
        { role: "system", content: addition },
        ...processedMessages,
      ];
    }
  }

  // 4. Determine routing
  let provider: "anthropic" | "openai" | "google";
  let actualModel: string;
  let complexity: "simple" | "medium" | "complex" | undefined;
  const userText = extractUserText(messages);

  const knownModel = modelByBareId[requestedModel];
  const geminiKey = process.env.GEMINI_API_KEY ?? "";

  // Pool providers available on the server (for credit-funded requests)
  const poolProviders: Provider[] = [];
  for (const [prov, envKey] of Object.entries(POOL_KEY_MAP)) {
    if (process.env[envKey]) poolProviders.push(prov as Provider);
  }
  const canUseCredits = creditBalance > 0 && poolProviders.length > 0;

  // Helper to parse a full modelId into { provider, model }
  const parseOverride = (id?: string) =>
    id ? { provider: modelProvider(id), model: bareModelId(id) } : undefined;

  if (
    knownModel &&
    routingProviders.includes(knownModel.provider as typeof provider)
  ) {
    // Direct model passthrough — matched a model AND provider is available
    provider = knownModel.provider as typeof provider;
    actualModel = knownModel.bareId;
  } else if (settings.routingEnabled && geminiKey) {
    // Smart routing — classify complexity, then pick model based on funding source
    let activeRouting: any;

    if (canUseCredits) {
      // CREDIT PATH: use credit model settings → fall back to ROUTING_PREFERENCES with pool providers
      const creditFallback = (tier: "simple" | "medium" | "complex") => {
        const match = ROUTING_PREFERENCES[tier].find((p) =>
          poolProviders.includes(p.provider as Provider),
        );
        return match
          ? { provider: match.provider as Provider, model: match.model }
          : undefined;
      };
      activeRouting = {
        simple:
          parseOverride(settings.creditSimpleModel) ?? creditFallback("simple"),
        medium:
          parseOverride(settings.creditMediumModel) ?? creditFallback("medium"),
        complex:
          parseOverride(settings.creditComplexModel) ??
          creditFallback("complex"),
      };
    } else {
      // USER KEY PATH: use routing model settings → fall back to ROUTING_PREFERENCES with user providers
      const userFallback = (tier: "simple" | "medium" | "complex") => {
        const match = ROUTING_PREFERENCES[tier].find((p) =>
          availableProviders.includes(p.provider as any),
        );
        return match
          ? { provider: match.provider as Provider, model: match.model }
          : undefined;
      };
      activeRouting = {
        simple:
          parseOverride(settings.routingSimpleModel) ?? userFallback("simple"),
        medium:
          parseOverride(settings.routingMediumModel) ?? userFallback("medium"),
        complex:
          parseOverride(settings.routingComplexModel) ??
          userFallback("complex"),
      };
    }

    const decision = await classifyAndRoute(
      userText,
      geminiKey,
      routingProviders,
      activeRouting,
    );
    provider = decision.provider;
    actualModel = decision.model;
    complexity = decision.complexity;
  } else {
    // Routing OFF — pick a single model based on funding source
    if (canUseCredits) {
      // Credit default model
      const creditDefault = parseOverride(settings.creditDefaultModel);
      if (creditDefault && poolProviders.includes(creditDefault.provider)) {
        provider = creditDefault.provider;
        actualModel = creditDefault.model;
      } else {
        // Fall back to first pool provider's default
        provider = poolProviders[0];
        actualModel = DEFAULT_MODEL_FOR_PROVIDER[provider] ?? "gpt-5-mini";
      }
    } else if (settings.preferredModel) {
      // User's chosen model
      const chosenBare = bareModelId(settings.preferredModel);
      const chosenProvider = modelProvider(settings.preferredModel);
      if (routingProviders.includes(chosenProvider)) {
        provider = chosenProvider;
        actualModel = chosenBare;
      } else {
        provider = routingProviders[0];
        actualModel = DEFAULT_MODEL_FOR_PROVIDER[provider] ?? "gpt-5-mini";
      }
    } else {
      // No preferred model — use preferred provider's default
      const preferred = settings.preferredProvider;
      provider = routingProviders.includes(preferred)
        ? preferred
        : routingProviders[0];
      actualModel = DEFAULT_MODEL_FOR_PROVIDER[provider] ?? "gpt-5-mini";
    }
  }

  // 5. Check prompt cache
  const cacheInput = `${settings.systemPromptAddition ?? ""}|${actualModel}|${userText}`;
  const promptHash = await computeHash(cacheInput);

  if (settings.cacheEnabled) {
    const cached = await fetchQuery(api.cacheStore.getByHash, {
      userId,
      promptHash,
    });
    if (cached) {
      const latencyMs = Date.now() - start;
      // Log cache hit async
      fetchMutation(api.requests.log, {
        userId,
        model: cached.model,
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
        cached: true,
        latencyMs,
        complexity,
        adId: ad?._id,
        creditsEarned: ad ? (ad.cpm * CREDIT_SPLIT) / 1000 : undefined,
        proxySecret: PROXY_SECRET,
      }).catch(console.error);

      // Earn credits from ad even on cache hit
      if (ad) {
        fetchMutation(api.credits.earnFromAd, {
          userId,
          adId: ad._id,
          proxySecret: PROXY_SECRET,
        }).catch(console.error);
      }

      // Track cache hit
      ph.capture({
        distinctId: userId,
        event: "chat_completion_cache_hit",
        properties: { model: cached.model, latency_ms: latencyMs },
      });
      ph.shutdown().catch(() => {});

      // Stream cached response as SSE
      const cachedText = cached.responseText;
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          // Send in chunks for realistic streaming feel
          const chunkSize = 20;
          for (let i = 0; i < cachedText.length; i += chunkSize) {
            const chunk = cachedText.slice(i, i + chunkSize);
            controller.enqueue(
              encoder.encode(
                `data: ${makeOpenAIChunk(chunk, cached.model)}\n\n`,
              ),
            );
          }
          if (ad) {
            controller.enqueue(
              encoder.encode(
                `data: ${makeOpenAIChunk(formatAdMarkdown(ad), cached.model)}\n\n`,
              ),
            );
          }
          controller.enqueue(
            encoder.encode(
              `data: ${makeOpenAIChunk("", cached.model, "stop")}\n\n`,
            ),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "X-Relay-Cached": "true",
          "X-Relay-Model": cached.model,
        },
      });
    }
  }

  // 6. Get API key: prefer pool key (credits), fall back to user's own key
  let apiKey: string;
  let usedPoolKey = false;

  const poolKey = process.env[POOL_KEY_MAP[provider] ?? ""];

  if (poolKey && creditBalance > 0) {
    // Pool key available and user has credits — use adllm inference
    apiKey = poolKey;
    usedPoolKey = true;
  } else {
    // Fall back to user's own key
    const encryptedKeyData = await fetchQuery(
      api.apiKeys.getEncryptedForProvider,
      { userId, provider },
    );
    if (encryptedKeyData) {
      apiKey = await decrypt(
        encryptedKeyData.encryptedKey,
        encryptedKeyData.iv,
      );
    } else if (poolKey) {
      // Pool key exists but no credits and no user key
      ph.capture({
        distinctId: userId,
        event: "insufficient_credits_error",
        properties: { provider },
      });
      ph.shutdown().catch(() => {});
      return new Response(
        JSON.stringify({
          error:
            "Insufficient credits. Enable ads to earn credits for API usage.",
        }),
        { status: 402, headers: { "Content-Type": "application/json" } },
      );
    } else {
      return new Response(
        JSON.stringify({
          error: `No API key for ${provider} and no pool key available.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // 6a. Cost pre-check: ensure credits cover estimated cost when using pool key
  if (usedPoolKey) {
    const inputTokenEstimate = JSON.stringify(processedMessages).length / 4;
    const outputTokenEstimate = inputTokenEstimate; // rough 1:1 estimate
    const estimatedCost = estimateCost(
      actualModel,
      inputTokenEstimate,
      outputTokenEstimate,
    );
    if (estimatedCost > creditBalance) {
      // Credits probably won't cover this — try falling back to user's own key
      const encryptedKeyData = await fetchQuery(
        api.apiKeys.getEncryptedForProvider,
        { userId, provider },
      );
      if (encryptedKeyData) {
        apiKey = await decrypt(
          encryptedKeyData.encryptedKey,
          encryptedKeyData.iv,
        );
        usedPoolKey = false;
      } else {
        // No user key and insufficient credits — block the request
        ph.shutdown().catch(() => {});
        return new Response(
          JSON.stringify({
            error:
              "Insufficient credits for this request. Add your own API key or earn more credits.",
          }),
          { status: 402, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    // Pre-deduct credits BEFORE streaming to prevent race conditions.
    // Actual cost is reconciled after streaming completes.
    if (usedPoolKey) {
      try {
        await fetchMutation(api.credits.spend, {
          userId,
          amount: estimatedCost,
          proxySecret: PROXY_SECRET,
        });
      } catch {
        // Spend failed (e.g. concurrent request drained credits) — try user's own key
        const encryptedKeyData = await fetchQuery(
          api.apiKeys.getEncryptedForProvider,
          { userId, provider },
        );
        if (encryptedKeyData) {
          apiKey = await decrypt(
            encryptedKeyData.encryptedKey,
            encryptedKeyData.iv,
          );
          usedPoolKey = false;
        } else {
          ph.shutdown().catch(() => {});
          return new Response(
            JSON.stringify({
              error:
                "Insufficient credits. Add your own API key or earn more credits.",
            }),
            { status: 402, headers: { "Content-Type": "application/json" } },
          );
        }
      }
    }
  }

  // Track how much was pre-deducted so we can reconcile after streaming
  const preDeductedAmount = usedPoolKey
    ? estimateCost(
        actualModel,
        JSON.stringify(processedMessages).length / 4,
        JSON.stringify(processedMessages).length / 4,
      )
    : 0;

  // 7. Stream response from provider
  let llmModel: LanguageModel;
  if (provider === "anthropic") {
    const anthropic = createAnthropic({ apiKey });
    llmModel = anthropic(actualModel);
  } else if (provider === "openai") {
    const openai = createOpenAI({ apiKey });
    llmModel = openai(actualModel);
  } else {
    const google = createGoogleGenerativeAI({ apiKey });
    llmModel = google(actualModel);
  }

  let fullResponse = "";
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    const result = streamText({
      model: llmModel,
      messages: processedMessages as any[],
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(
                `data: ${makeOpenAIChunk(chunk, actualModel)}\n\n`,
              ),
            );
          }
          if (ad) {
            controller.enqueue(
              encoder.encode(
                `data: ${makeOpenAIChunk(formatAdMarkdown(ad), actualModel)}\n\n`,
              ),
            );
          }
          controller.enqueue(
            encoder.encode(
              `data: ${makeOpenAIChunk("", actualModel, "stop")}\n\n`,
            ),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));

          // Get token usage (AI SDK v6: inputTokens/outputTokens)
          const usage = (await result.usage) as {
            inputTokens?: number;
            outputTokens?: number;
          };
          promptTokens = usage.inputTokens ?? 0;
          completionTokens = usage.outputTokens ?? 0;

          const latencyMs = Date.now() - start;
          const costUsd = estimateCost(
            actualModel,
            promptTokens,
            completionTokens,
          );

          // Log to Convex (fire and forget)
          fetchMutation(api.requests.log, {
            userId,
            model: actualModel,
            promptTokens,
            completionTokens,
            costUsd,
            cached: false,
            latencyMs,
            complexity,
            adId: ad?._id,
            creditsEarned: ad ? (ad.cpm * CREDIT_SPLIT) / 1000 : undefined,
            fundedByCredits: usedPoolKey || undefined,
            proxySecret: PROXY_SECRET,
          }).catch(console.error);

          // Credit operations (fire and forget)
          if (ad) {
            fetchMutation(api.credits.earnFromAd, {
              userId,
              adId: ad._id,
              proxySecret: PROXY_SECRET,
            }).catch(console.error);
          }
          // Reconcile pre-deducted credits with actual cost
          if (usedPoolKey && preDeductedAmount > 0) {
            const diff = preDeductedAmount - costUsd;
            if (diff > 0.000001) {
              // Over-charged: refund the difference
              fetchMutation(api.credits.refund, {
                userId,
                amount: diff,
                proxySecret: PROXY_SECRET,
              }).catch(console.error);
            } else if (diff < -0.000001) {
              // Under-charged: deduct the extra
              fetchMutation(api.credits.spend, {
                userId,
                amount: -diff,
                proxySecret: PROXY_SECRET,
              }).catch(console.error);
            }
            // If diff ≈ 0, no reconciliation needed
          }

          // Track successful completion
          ph.capture({
            distinctId: userId,
            event: "chat_completion_succeeded",
            properties: {
              model: actualModel,
              provider,
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              cost_usd: costUsd,
              latency_ms: latencyMs,
              complexity,
              cache_hit: false,
            },
          });
          if (usedPoolKey) {
            ph.capture({
              distinctId: userId,
              event: "relay_pool_key_used",
              properties: {
                provider,
                model: actualModel,
                credit_balance: creditBalance,
              },
            });
            ph.capture({
              distinctId: userId,
              event: "credits_spent",
              properties: { amount: costUsd, provider, model: actualModel },
            });
          }
          if (ad) {
            ph.capture({
              distinctId: userId,
              event: "credits_earned",
              properties: {
                amount: (ad.cpm * CREDIT_SPLIT) / 1000,
                ad_sponsor: ad.sponsor,
              },
            });
          }
          ph.shutdown().catch(() => {});

          // Store in cache (fire and forget)
          if (settings.cacheEnabled && fullResponse) {
            fetchMutation(api.cacheStore.store, {
              userId,
              promptHash,
              responseText: fullResponse,
              model: actualModel,
              proxySecret: PROXY_SECRET,
            }).catch(console.error);
          }

          controller.close();
        } catch (err) {
          const latencyMs = Date.now() - start;
          fetchMutation(api.requests.log, {
            userId,
            model: actualModel,
            promptTokens: 0,
            completionTokens: 0,
            costUsd: 0,
            cached: false,
            latencyMs,
            error: safeErrorMessage(err),
            proxySecret: PROXY_SECRET,
          }).catch(console.error);

          // Track failure
          ph.capture({
            distinctId: userId,
            event: "chat_completion_failed",
            properties: {
              model: actualModel,
              provider,
              latency_ms: latencyMs,
              error: safeErrorMessage(err),
            },
          });
          ph.shutdown().catch(() => {});

          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Relay-Model": actualModel,
        "X-Relay-Provider": provider,
        ...(complexity ? { "X-Relay-Complexity": complexity } : {}),
      },
    });
  } catch (err) {
    const latencyMs = Date.now() - start;
    fetchMutation(api.requests.log, {
      userId,
      model: actualModel,
      promptTokens: 0,
      completionTokens: 0,
      costUsd: 0,
      cached: false,
      latencyMs,
      error: safeErrorMessage(err),
      proxySecret: PROXY_SECRET,
    }).catch(console.error);

    // Track outer failure
    ph.capture({
      distinctId: userId,
      event: "chat_completion_failed",
      properties: {
        model: actualModel,
        provider,
        latency_ms: latencyMs,
        error: safeErrorMessage(err),
      },
    });
    ph.shutdown().catch(() => {});

    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

// IDEs may send OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    },
  });
}
