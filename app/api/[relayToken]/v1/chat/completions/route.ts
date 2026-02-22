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
import { classifyAndRoute, MODEL_PROVIDER_MAP } from "@/lib/routing";

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

// Cost per 1M tokens (input + output average)
const MODEL_COSTS: Record<string, number> = {
  "gemini-2.0-flash": 0.075,
  "gpt-4o-mini": 0.15,
  "gpt-4o": 2.5,
  "claude-sonnet-4-5": 3.0,
  "claude-3-5-sonnet-20241022": 3.0,
  "claude-haiku-4-5": 0.8,
};

function estimateCost(model: string, tokens: number): number {
  const rate = MODEL_COSTS[model] ?? 1.0;
  return (tokens / 1_000_000) * rate;
}

function safeErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Unknown error";
  // Strip anything that looks like an API key (sk-..., AIza..., etc.)
  return msg.replace(
    /\b(sk-[a-zA-Z0-9_-]{10,}|AIza[a-zA-Z0-9_-]{10,}|Bearer\s+\S+)\b/g,
    "[REDACTED]",
  );
}

function makeOpenAIChunk(content: string, model: string): string {
  return JSON.stringify({
    id: `chatcmpl-relay-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta: { content }, finish_reason: null }],
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

  const knownModel = MODEL_PROVIDER_MAP[requestedModel];
  const geminiKey = process.env.GEMINI_API_KEY ?? "";

  if (knownModel) {
    // Direct model passthrough — use whatever provider the model belongs to
    provider = knownModel.provider;
    actualModel = knownModel.model;
  } else if (settings.routingEnabled && geminiKey) {
    const decision = await classifyAndRoute(
      userText,
      geminiKey,
      routingProviders,
    );
    provider = decision.provider;
    actualModel = decision.model;
    complexity = decision.complexity;
  } else {
    // Routing off — use preferred provider if available, else first available
    const preferred = settings.preferredProvider;
    provider = routingProviders.includes(preferred)
      ? preferred
      : routingProviders[0];
    actualModel =
      provider === "anthropic"
        ? "claude-sonnet-4-5"
        : provider === "openai"
          ? "gpt-4o-mini"
          : "gemini-2.0-flash";
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
    const estimatedCost = estimateCost(actualModel, inputTokenEstimate * 2);
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
      }
      // If no user key, proceed with pool key anyway (best-effort)
    }
  }

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
            promptTokens + completionTokens,
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
          if (usedPoolKey && costUsd > 0) {
            fetchMutation(api.credits.spend, {
              userId,
              amount: costUsd,
              proxySecret: PROXY_SECRET,
            }).catch(console.error);
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
