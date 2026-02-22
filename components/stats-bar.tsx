"use client";

import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { ActivityIcon, DollarSignIcon, PiggyBankIcon, DatabaseIcon, MegaphoneIcon } from "lucide-react";

function StatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsBar() {
  const stats = useQuery(api.requests.getStats);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="h-10 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard
        label="Requests (24h)"
        value={stats.total.toString()}
        icon={<ActivityIcon className="h-4 w-4" />}
      />
      <StatCard
        label="Cost (24h)"
        value={`$${stats.totalCost.toFixed(4)}`}
        icon={<DollarSignIcon className="h-4 w-4" />}
      />
      <StatCard
        label="Cache Hit Rate"
        value={`${stats.cacheHitRate.toFixed(0)}%`}
        icon={<DatabaseIcon className="h-4 w-4" />}
        sub={`${stats.cached} of ${stats.total} requests`}
      />
      <StatCard
        label="You Saved (24h)"
        value={`$${(stats.totalSavings ?? 0).toFixed(4)}`}
        icon={<PiggyBankIcon className="h-4 w-4" />}
        sub={`${stats.creditFunded ?? 0} requests on Relay inference`}
      />
      <StatCard
        label="Credits Earned (24h)"
        value={`$${(stats.creditsEarned ?? 0).toFixed(4)}`}
        icon={<MegaphoneIcon className="h-4 w-4" />}
        sub={`${stats.adImpressions ?? 0} impressions · ${(stats.costOffset ?? 0).toFixed(0)}% offset`}
      />
    </div>
  );
}
