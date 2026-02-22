"use client";

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
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";

function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.001) return "<$0.001";
  return `$${usd.toFixed(4)}`;
}

function modelColor(model: string): string {
  if (model.includes("claude")) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  if (model.includes("gpt")) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (model.includes("gemini")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  return "";
}

export function RequestLog() {
  const requests = useQuery(api.requests.getRecent, { limit: 50 });

  if (!requests) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium">No requests yet</p>
        <p className="text-xs text-muted-foreground">
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
              className={r.cached ? "bg-green-50/50 dark:bg-green-950/20" : ""}
            >
              <TableCell className="text-xs text-muted-foreground">
                {formatDistanceToNow(r.createdAt, { addSuffix: true })}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${modelColor(r.model)}`}
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
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right text-xs">
                {r.cached ? (
                  <span className="text-muted-foreground">cached</span>
                ) : (
                  `${r.promptTokens + r.completionTokens}`
                )}
              </TableCell>
              <TableCell className="text-right text-xs font-mono">
                {r.error ? (
                  <span className="text-red-500">error</span>
                ) : (
                  <span className={r.cached ? "font-medium text-green-600" : ""}>
                    {formatCost(r.costUsd)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                {r.latencyMs}ms
              </TableCell>
              <TableCell className="text-xs">
                {r.fundedByCredits ? (
                  <span className="flex items-center gap-1">
                    <Badge className="bg-purple-100 text-purple-700 text-xs hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400">
                      credits
                    </Badge>
                    <span className="text-emerald-600 font-medium">saved {formatCost(r.costUsd)}</span>
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
