"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { TrendingUpIcon } from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api } from "@/convex/_generated/api";

type Range = "24h" | "7d" | "30d" | "all";

export function UsageChart() {
  const [range, setRange] = useState<Range>("7d");
  const stats = useQuery(api.requests.getHistoricalStats, { range });

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="h-70 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (stats.timeSeries.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUpIcon className="h-4 w-4" />
            Usage Over Time
          </CardTitle>
          <RangeToggle range={range} setRange={setRange} />
        </CardHeader>
        <CardContent>
          <div className="flex h-70 items-center justify-center text-muted-foreground text-sm">
            No data for this time range yet. Make some requests!
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTimestamp = (ts: number) => {
    if (range === "24h") return format(ts, "HH:mm");
    if (range === "7d") return format(ts, "EEE HH:mm");
    return format(ts, "MMM d");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUpIcon className="h-4 w-4" />
          Usage Over Time
        </CardTitle>
        <RangeToggle range={range} setRange={setRange} />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={stats.timeSeries}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTimestamp}
              className="text-xs"
              tick={{ fontSize: 10 }}
            />
            <YAxis className="text-xs" tick={{ fontSize: 10 }} />
            <Tooltip
              labelFormatter={(label) => formatTimestamp(Number(label))}
              formatter={(value, name) => [
                `$${Number(value).toFixed(6)}`,
                name === "cost"
                  ? "Cost"
                  : name === "savings"
                    ? "You Saved"
                    : "Credits Earned",
              ]}
            />
            <Area
              type="monotone"
              dataKey="cost"
              stroke="hsl(221, 83%, 53%)"
              fill="hsl(221, 83%, 53%)"
              fillOpacity={0.1}
              name="cost"
            />
            <Area
              type="monotone"
              dataKey="savings"
              stroke="hsl(160, 84%, 39%)"
              fill="hsl(160, 84%, 39%)"
              fillOpacity={0.15}
              name="savings"
            />
            <Area
              type="monotone"
              dataKey="creditsEarned"
              stroke="hsl(142, 71%, 45%)"
              fill="hsl(142, 71%, 45%)"
              fillOpacity={0.1}
              name="creditsEarned"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function RangeToggle({
  range,
  setRange,
}: {
  range: Range;
  setRange: (r: Range) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={range}
      onValueChange={(v) => v && setRange(v as Range)}
      size="sm"
    >
      <ToggleGroupItem value="24h" className="px-2 text-xs">
        24h
      </ToggleGroupItem>
      <ToggleGroupItem value="7d" className="px-2 text-xs">
        7d
      </ToggleGroupItem>
      <ToggleGroupItem value="30d" className="px-2 text-xs">
        30d
      </ToggleGroupItem>
      <ToggleGroupItem value="all" className="px-2 text-xs">
        All
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
