"use client";

import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { WalletIcon } from "lucide-react";

export function CreditBalanceCard() {
  const balance = useQuery(api.credits.getBalance);
  const stats = useQuery(api.requests.getStats);

  if (balance === null || balance === undefined) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="rounded-md bg-primary/10 p-3 text-primary">
          <WalletIcon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Credit Balance</p>
          <p className="text-2xl font-bold">${balance.toFixed(4)}</p>
          <p className="text-xs text-muted-foreground">
            {stats?.adImpressions ?? 0} ad impressions earned you ~$
            {(stats?.creditsEarned ?? 0).toFixed(4)} today
            {(stats?.totalSavings ?? 0) > 0
              ? ` · You saved $${stats!.totalSavings.toFixed(4)} using Relay inference`
              : stats?.creditFunded
                ? ` · ${stats.creditFunded} requests funded by credits`
                : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Powered by</p>
          <p className="text-sm font-medium">Sponsored ads</p>
          <p className="text-xs text-muted-foreground">Free API usage</p>
        </div>
      </CardContent>
    </Card>
  );
}
