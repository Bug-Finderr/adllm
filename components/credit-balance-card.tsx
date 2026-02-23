"use client";

import { useQuery } from "convex/react";
import { SparklesIcon, WalletIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";

export function CreditBalanceCard() {
  const balance = useQuery(api.credits.getBalance);
  const stats = useQuery(api.requests.getStats);

  if (balance == null) return null;

  const impressions = stats?.adImpressions ?? 0;
  const earned = stats?.creditsEarned ?? 0;
  const saved = stats?.totalSavings ?? 0;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-primary/10 p-2.5 text-primary">
            <WalletIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Credit Balance</p>
            <p className="font-bold text-2xl leading-tight">
              ${balance.toFixed(4)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
          {earned > 0 && (
            <span className="flex items-center gap-1">
              <SparklesIcon className="h-3 w-3 text-green-500" />
              +${earned.toFixed(4)} earned today
            </span>
          )}
          {saved > 0 && (
            <span className="flex items-center gap-1">
              <SparklesIcon className="h-3 w-3 text-emerald-500" />$
              {saved.toFixed(4)} saved
            </span>
          )}
          {impressions > 0 && <span>{impressions} ad impressions</span>}
        </div>
      </CardContent>
    </Card>
  );
}
