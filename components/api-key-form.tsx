"use client";

import { useMutation, useQuery } from "convex/react";
import { CheckCircle2Icon, KeyIcon, Trash2Icon } from "lucide-react";
import posthog from "posthog-js";
import { useState } from "react";
import { toast } from "sonner";
import { encryptApiKey } from "@/app/actions/encrypt-key";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { PROVIDER_COLOR, PROVIDER_DISPLAY, type Provider } from "@/lib/models";
import { cn } from "@/lib/utils";

const PROVIDERS: Array<{
  id: Provider;
  placeholder: string;
}> = [
  { id: "anthropic", placeholder: "sk-ant-..." },
  { id: "openai", placeholder: "sk-..." },
  { id: "google", placeholder: "AIzaSy..." },
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
      const { encryptedKey, iv } = await encryptApiKey(value.trim());
      const preview = `...${value.trim().slice(-4)}`;
      await upsert({ provider, encryptedKey, iv, keyPreview: preview });
      setValues((v) => ({ ...v, [provider]: "" }));
      toast.success(`${provider} API key saved`);
      posthog.capture("api_key_saved", { provider });
    } catch {
      toast.error("Failed to save API key");
      posthog.capture("api_key_save_failed", { provider });
    }
    setSaving(null);
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
                    className={cn(
                      "rounded px-1.5 py-0.5 font-medium text-xs",
                      PROVIDER_COLOR[p.id],
                    )}
                  >
                    {PROVIDER_DISPLAY[p.id]}
                  </span>
                </Label>
                {existing && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle2Icon className="h-3 w-3" />
                      Saved {existing.keyPreview}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2Icon className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete {PROVIDER_DISPLAY[p.id]} key?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove your{" "}
                            {PROVIDER_DISPLAY[p.id]} API key. Any routing or
                            default model settings using this provider will stop
                            working.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                              remove({ id: existing._id });
                              posthog.capture("api_key_removed", {
                                provider: p.id,
                              });
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
                    if (e.key === "Enter" && !existing)
                      handleSave(p.id, values[p.id] ?? "");
                  }}
                />
                {existing ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving === p.id || !values[p.id]?.trim()}
                      >
                        {saving === p.id ? "..." : "Update"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Update {PROVIDER_DISPLAY[p.id]} key?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will replace your existing{" "}
                          {PROVIDER_DISPLAY[p.id]} API key. The old key cannot
                          be recovered.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleSave(p.id, values[p.id] ?? "")}
                        >
                          Update
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving === p.id || !values[p.id]?.trim()}
                    onClick={() => handleSave(p.id, values[p.id] ?? "")}
                  >
                    {saving === p.id ? "..." : "Save"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        <p className="text-muted-foreground text-xs">
          Keys are encrypted with AES-256-GCM before storage and only decrypted
          in-memory during requests.
        </p>
      </CardContent>
    </Card>
  );
}
