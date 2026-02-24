"use server";

import type { Provider } from "@/lib/models";

const POOL_KEY_ENV: Record<Provider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GEMINI_API_KEY",
};

/** Returns which providers have pool keys configured on the server */
export async function getPoolProviders(): Promise<Provider[]> {
  return (Object.entries(POOL_KEY_ENV) as [Provider, string][])
    .filter(([, envKey]) => !!process.env[envKey])
    .map(([provider]) => provider);
}
