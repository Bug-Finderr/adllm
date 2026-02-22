"use client";

import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.001) return "<$0.001";
  return `$${usd.toFixed(4)}`;
}

function modelColor(model: string): string {
  if (model.includes("claude"))
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  if (model.includes("gpt"))
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (model.includes("gemini"))
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  return "";
}

export function RequestLog() {
  const requests = useQuery(api.requests.getRecent, { limit: 10 });

  if (!requests) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
        <p className="font-medium text-sm">No requests yet</p>
        <p className="text-muted-foreground text-xs">
          Configure your IDE with the proxy URL above and make a request.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Time</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Complexity</TableHead>
            <TableHead className="text-right">Tokens</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Latency</TableHead>
            <TableHead>Funded</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r: Doc<"requests">) => (
            <TableRow
              key={r._id}
              className={cn(r.cached && "bg-green-50/50 dark:bg-green-950/20")}
            >
              <TableCell className="text-muted-foreground text-xs">
                {formatDistanceToNow(r.createdAt, { addSuffix: true })}
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    "inline-flex items-center rounded px-1.5 py-0.5 font-medium text-xs",
                    modelColor(r.model),
                  )}
                >
                  {r.model}
                </span>
              </TableCell>
              <TableCell>
                {r.complexity ? (
                  <Badge
                    variant={
                      r.complexity === "complex"
                        ? "destructive"
                        : r.complexity === "medium"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-xs"
                  >
                    {r.complexity}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell className="text-right text-xs">
                {r.cached ? (
                  <span className="text-muted-foreground">cached</span>
                ) : (
                  `${r.promptTokens + r.completionTokens}`
                )}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {r.error ? (
                  <span className="text-red-500">error</span>
                ) : (
                  <span
                    className={cn(r.cached && "font-medium text-green-600")}
                  >
                    {formatCost(r.costUsd)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right text-muted-foreground text-xs">
                {r.latencyMs}ms
              </TableCell>
              <TableCell className="text-xs">
                {r.fundedByCredits ? (
                  <span className="flex items-center gap-1">
                    <Badge className="bg-purple-100 text-purple-700 text-xs hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400">
                      credits
                    </Badge>
                    <span className="font-medium text-emerald-600">
                      saved {formatCost(r.costUsd)}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">own key</span>
                )}
              </TableCell>
              <TableCell>
                {r.error ? (
                  <Badge variant="destructive" className="text-xs">
                    error
                  </Badge>
                ) : r.cached ? (
                  <Badge className="bg-green-100 text-green-700 text-xs hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                    cached
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    ok
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
