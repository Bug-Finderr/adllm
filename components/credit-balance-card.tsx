"use client";

import { useQuery } from "convex/react";
import { WalletIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";

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
          <p className="text-muted-foreground text-xs">Credit Balance</p>
          <p className="font-bold text-2xl">${balance.toFixed(4)}</p>
          <p className="text-muted-foreground text-xs">
            {stats?.adImpressions ?? 0} ad impressions earned you ~$
            {(stats?.creditsEarned ?? 0).toFixed(4)} today
            {(stats?.totalSavings ?? 0) > 0
              ? ` · You saved $${stats!.totalSavings.toFixed(4)} using AdLLM inference`
              : stats?.creditFunded
                ? ` · ${stats.creditFunded} requests funded by credits`
                : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Powered by</p>
          <p className="font-medium text-sm">Sponsored ads</p>
          <p className="text-muted-foreground text-xs">Free API usage</p>
        </div>
      </CardContent>
    </Card>
  );
}
