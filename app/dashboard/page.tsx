"use client";

import { ProxyUrlCard } from "@/components/proxy-url-card";
import { RequestLog } from "@/components/request-log";
import { StatsBar } from "@/components/stats-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ActivityIcon } from "lucide-react";
import { useEffect } from "react";

export default function DashboardPage() {
  const viewer = useQuery(api.users.viewer);
  const settings = useQuery(api.settings.get);
  const getOrCreate = useMutation(api.settings.getOrCreate);

  // Initialize settings only once we know the user is authenticated
  useEffect(() => {
    if (viewer && settings === null) {
      getOrCreate().catch(console.error);
    }
  }, [viewer, settings, getOrCreate]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Real-time view of your AI proxy requests
        </p>
      </div>

      <ProxyUrlCard />

      <StatsBar />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ActivityIcon className="h-4 w-4" />
            Recent Requests
            <span className="ml-auto text-xs font-normal text-muted-foreground">
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
