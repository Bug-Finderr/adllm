"use client";

import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { ActivityIcon, DollarSignIcon, ZapIcon, DatabaseIcon } from "lucide-react";

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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
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
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        label="Models Used"
        value={Object.keys(stats.byModel).length.toString()}
        icon={<ZapIcon className="h-4 w-4" />}
        sub={
          Object.entries(stats.byModel)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 2)
            .map(([m]) => m.split("-").slice(0, 2).join("-"))
            .join(", ") || "none yet"
        }
      />
    </div>
  );
}
