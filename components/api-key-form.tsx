"use client";

import { useMutation, useQuery } from "convex/react";
import { CheckCircle2Icon, KeyIcon, Trash2Icon } from "lucide-react";
import posthog from "posthog-js";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { encrypt } from "@/lib/encryption";

const PROVIDERS = [
  {
    id: "anthropic" as const,
    name: "Anthropic",
    placeholder: "sk-ant-...",
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  {
    id: "openai" as const,
    name: "OpenAI",
    placeholder: "sk-...",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    id: "google" as const,
    name: "Google (Gemini)",
    placeholder: "AIzaSy...",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
];

export function ApiKeyForm() {
  const apiKeys = useQuery(api.apiKeys.list);
  const upsert = useMutation(api.apiKeys.upsert);
  const remove = useMutation(api.apiKeys.remove);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  async function handleSave(
    provider: "anthropic" | "openai" | "google",
    value: string,
  ) {
    if (!value.trim()) return;
    setSaving(provider);
    try {
      const { encryptedKey, iv } = await encrypt(value.trim());
      const preview = `...${value.trim().slice(-4)}`;
      await upsert({ provider, encryptedKey, iv, keyPreview: preview });
      setValues((v) => ({ ...v, [provider]: "" }));
      toast.success(`${provider} API key saved`);
      posthog.capture("api_key_saved", { provider });
    } catch {
      toast.error("Failed to save API key");
      posthog.capture("api_key_save_failed", { provider });
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyIcon className="h-4 w-4" />
          API Keys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {PROVIDERS.map((p) => {
          const existing = apiKeys?.find(
            (k: { provider: string; _id: string; keyPreview: string }) =>
              k.provider === p.id,
          );
          return (
            <div key={p.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 font-medium text-xs ${p.color}`}
                  >
                    {p.name}
                  </span>
                </Label>
                {existing && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle2Icon className="h-3 w-3" />
                      Saved {existing.keyPreview}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        remove({ id: existing._id });
                        posthog.capture("api_key_removed", { provider: p.id });
                      }}
                    >
                      <Trash2Icon className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder={existing ? "Update key..." : p.placeholder}
                  value={values[p.id] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [p.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave(p.id, values[p.id] ?? "");
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving === p.id || !values[p.id]?.trim()}
                  onClick={() => handleSave(p.id, values[p.id] ?? "")}
                >
                  {saving === p.id ? "..." : existing ? "Update" : "Save"}
                </Button>
              </div>
            </div>
          );
        })}
        <p className="text-muted-foreground text-xs">
          Keys are encrypted with AES-GCM before storage. They never leave your
          browser unencrypted.
        </p>
      </CardContent>
    </Card>
  );
}
