"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { TrendingUpIcon } from "lucide-react";

type Range = "24h" | "7d" | "30d" | "all";

export function UsageChart() {
  const [range, setRange] = useState<Range>("7d");
  const stats = useQuery(api.requests.getHistoricalStats, { range });

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="h-[280px] animate-pulse rounded bg-muted" />
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
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
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
        <div className="mb-4 grid grid-cols-4 gap-4 text-center text-xs">
          <div>
            <p className="text-muted-foreground">Requests</p>
            <p className="text-lg font-bold">{stats.total}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Cost</p>
            <p className="text-lg font-bold">${stats.totalCost.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Credits Earned</p>
            <p className="text-lg font-bold text-green-600">${stats.creditsEarned.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Credit-Funded</p>
            <p className="text-lg font-bold text-purple-600">{stats.creditFunded}</p>
          </div>
        </div>
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
                name === "cost" ? "Cost" : "Credits Earned",
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
      <ToggleGroupItem value="24h" className="text-xs px-2">
        24h
      </ToggleGroupItem>
      <ToggleGroupItem value="7d" className="text-xs px-2">
        7d
      </ToggleGroupItem>
      <ToggleGroupItem value="30d" className="text-xs px-2">
        30d
      </ToggleGroupItem>
      <ToggleGroupItem value="all" className="text-xs px-2">
        All
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
