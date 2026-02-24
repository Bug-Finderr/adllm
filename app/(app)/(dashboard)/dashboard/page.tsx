"use client";

import { useMutation, useQuery } from "convex/react";
import { ActivityIcon, KeyIcon } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import { useEffect } from "react";
import { CreditBalanceCard } from "@/components/credit-balance-card";
import { ProxyUrlCard } from "@/components/proxy-url-card";
import { RequestLog } from "@/components/request-log";
import { StatsBar } from "@/components/stats-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageChart } from "@/components/usage-chart";
import { api } from "@/convex/_generated/api";

export default function DashboardPage() {
  const viewer = useQuery(api.users.viewer);
  const settings = useQuery(api.settings.get);
  const stats = useQuery(api.requests.getStats);
  const apiKeys = useQuery(api.apiKeys.list);
  const getOrCreate = useMutation(api.settings.getOrCreate);

  // Initialize settings only once we know the user is authenticated
  useEffect(() => {
    if (viewer && settings === null) {
      getOrCreate().catch(console.error);
    }
  }, [viewer, settings, getOrCreate]);

  // Track dashboard view once the viewer is loaded
  useEffect(() => {
    if (viewer) {
      posthog.capture("dashboard_viewed", { email: viewer.email });
    }
  }, [viewer]);

  // Track first visit (no prior requests) for onboarding funnel
  useEffect(() => {
    if (viewer && stats !== undefined && stats !== null && stats.total === 0) {
      posthog.capture("dashboard_first_visit", { email: viewer.email });
    }
  }, [viewer, stats]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Real-time view of your AI proxy requests
        </p>
      </div>

      {apiKeys && apiKeys.length === 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <KeyIcon className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm">
            No API keys configured. Add at least one provider key to start using
            the proxy.
          </p>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="ml-auto shrink-0"
          >
            <Link href="/settings">Add keys</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CreditBalanceCard />
        <ProxyUrlCard />
      </div>

      <StatsBar />

      <UsageChart />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ActivityIcon className="h-4 w-4" />
            Recent Requests
            <span className="ml-auto font-normal text-muted-foreground text-xs">
              Updates in real-time
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <RequestLog />
        </CardContent>
      </Card>
    </div>
  );
}
