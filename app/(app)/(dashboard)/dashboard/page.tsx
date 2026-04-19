import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const token = await convexAuthNextjsToken();

  const [
    preloadedViewer,
    preloadedSettings,
    preloadedStats,
    preloadedBalance,
    preloadedApiKeys,
    preloadedRequests,
  ] = await Promise.all([
    preloadQuery(api.users.viewer, {}, { token }),
    preloadQuery(api.settings.get, {}, { token }),
    preloadQuery(api.requests.getStats, {}, { token }),
    preloadQuery(api.credits.getBalance, {}, { token }),
    preloadQuery(api.apiKeys.list, {}, { token }),
    preloadQuery(api.requests.getRecent, { limit: 10 }, { token }),
  ]);

  return (
    <DashboardClient
      preloadedViewer={preloadedViewer}
      preloadedSettings={preloadedSettings}
      preloadedStats={preloadedStats}
      preloadedBalance={preloadedBalance}
      preloadedApiKeys={preloadedApiKeys}
      preloadedRequests={preloadedRequests}
    />
  );
}
