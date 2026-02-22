"use client";

import { useMutation, useQuery } from "convex/react";
import { CheckIcon, CopyIcon, RefreshCwIcon, ZapIcon } from "lucide-react";
import posthog from "posthog-js";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";

export function ProxyUrlCard() {
  const settings = useQuery(api.settings.get);
  const regenerate = useMutation(api.settings.regenerateToken);
  const [copied, setCopied] = useState(false);

  const baseUrl = settings
    ? `${window.location.origin}/api/${settings.relayToken}/v1`
    : "";

  async function copyUrl() {
    await navigator.clipboard.writeText(baseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    posthog.capture("proxy_url_copied");
  }

  async function handleRegenerate() {
    await regenerate();
    toast.success("Token regenerated. Update your IDE.");
    posthog.capture("relay_token_regenerated");
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
          <Button
            size="sm"
            variant="outline"
            onClick={copyUrl}
            disabled={!settings}
          >
            {copied ? (
              <CheckIcon className="h-4 w-4 text-green-500" />
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-muted-foreground text-xs">
          Paste as <span className="font-medium text-foreground">OpenAI base URL</span> in
          your IDE. API key can be any value.
        </p>

        <details className="group">
          <summary className="cursor-pointer text-muted-foreground text-xs hover:text-foreground">
            IDE-specific setup instructions
          </summary>
          <div className="mt-2 space-y-1 rounded-md bg-muted p-3 text-xs">
            <p className="text-muted-foreground">
              <span className="font-mono text-foreground">Cursor</span> →
              Settings → Models → OpenAI → Override Base URL
            </p>
            <p className="text-muted-foreground">
              <span className="font-mono text-foreground">VS Code</span> →
              Chat: Manage Language Models → OpenAI Compatible
            </p>
            <p className="text-muted-foreground">
              <span className="font-mono text-foreground">Continue.dev</span> →
              config.yaml → <code>apiBase:</code>
            </p>
          </div>
        </details>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Badge variant="secondary">Auto-routing</Badge>
            <Badge variant="secondary">Prompt cache</Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-muted-foreground text-xs"
            onClick={handleRegenerate}
          >
            <RefreshCwIcon className="h-3 w-3" />
            Regenerate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
