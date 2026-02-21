"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { CheckIcon, CopyIcon, RefreshCwIcon, ZapIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ProxyUrlCard() {
  const settings = useQuery(api.settings.get);
  const regenerate = useMutation(api.settings.regenerateToken);
  const [copied, setCopied] = useState(false);

  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/${settings?.relayToken}/v1`
      : "";

  async function copyUrl() {
    await navigator.clipboard.writeText(baseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    await regenerate();
    toast.success("Relay token regenerated. Update your IDE.");
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ZapIcon className="h-4 w-4 text-primary" />
          Your Proxy URL
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            readOnly
            value={settings ? baseUrl : "Loading..."}
            className="font-mono text-xs"
          />
          <Button size="sm" variant="outline" onClick={copyUrl} disabled={!settings}>
            {copied ? (
              <CheckIcon className="h-4 w-4 text-green-500" />
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="rounded-md bg-muted p-3 text-xs space-y-1">
          <p className="font-medium">Setup Instructions:</p>
          <p className="text-muted-foreground">
            <span className="font-mono text-foreground">Cursor</span> → Settings → Models → OpenAI
            → Override Base URL → paste above
          </p>
          <p className="text-muted-foreground">
            <span className="font-mono text-foreground">VS Code</span> → Chat: Manage Language
            Models → OpenAI Compatible → paste above
          </p>
          <p className="text-muted-foreground">
            <span className="font-mono text-foreground">Continue.dev</span> → config.yaml →{" "}
            <code>apiBase: [paste above]</code>
          </p>
          <p className="text-muted-foreground mt-1">
            Set API key to <code className="text-foreground">relay</code> (any value works)
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Badge variant="secondary">Auto-routing</Badge>
            <Badge variant="secondary">Semantic cache</Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-xs text-muted-foreground"
            onClick={handleRegenerate}
          >
            <RefreshCwIcon className="h-3 w-3" />
            Regenerate token
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
