import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const token = await convexAuthNextjsToken();

  const [preloadedSettings, preloadedApiKeys, preloadedModels] =
    await Promise.all([
      preloadQuery(api.settings.get, {}, { token }),
      preloadQuery(api.apiKeys.list, {}, { token }),
      preloadQuery(api.models.list, {}, { token }),
    ]);

  return (
    <SettingsClient
      preloadedSettings={preloadedSettings}
      preloadedApiKeys={preloadedApiKeys}
      preloadedModels={preloadedModels}
    />
  );
}
