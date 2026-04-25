import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Save, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { trackEvent } from "@/lib/analytics";
import { EngineLayout, FormSection, PreviewCard } from "@/components/engine";

export interface StubEngineField {
  key: string;
  label: string;
  placeholder?: string;
  textarea?: boolean;
}

export interface StubEngineProps {
  /** engine_key written to assets table */
  engineKey: string;
  title: string;
  description: string;
  /** Short marketing line shown above the form */
  intro: string;
  /** Form fields (first one is used as the asset title seed) */
  fields: StubEngineField[];
  /** Build the asset content body from form values */
  buildContent: (values: Record<string, string>) => string;
  /** Build the asset title from form values */
  buildTitle: (values: Record<string, string>) => string;
  /** Optional sample values for the "Load sample" button */
  sample?: Record<string, string>;
  /** Asset type label persisted in content header (e.g. "blueprint", "launch-plan") */
  assetType: string;
}

/**
 * Generic stub engine: collects form input, generates a structured
 * markdown-ish output deterministically, and saves it as an asset.
 *
 * Used by the secondary engines (creator-blueprint, neon-studio, etc.)
 * so every engine can produce + persist output without bespoke logic.
 */
export function StubEngine({
  engineKey,
  title,
  description,
  intro,
  fields,
  buildContent,
  buildTitle,
  sample,
  assetType,
}: StubEngineProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const initial = useMemo(
    () => Object.fromEntries(fields.map((f) => [f.key, ""])) as Record<string, string>,
    [fields],
  );
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAssetId, setSavedAssetId] = useState<string | null>(null);
  const [output, setOutput] = useState<{ title: string; content: string } | null>(null);

  const set = (key: string, v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const firstFieldKey = fields[0]?.key;
  const canGenerate = Boolean(firstFieldKey && values[firstFieldKey]?.trim().length);

  const handleGenerate = async () => {
    if (!canGenerate || !user) return;
    setSaving(true);
    setSavedAssetId(null);

    const computedTitle = buildTitle(values).trim() || "Untitled";
    const body = buildContent(values);
    const content = `TYPE: ${assetType}\nENGINE: ${engineKey}\n\n${body}`;

    setOutput({ title: computedTitle, content });

    const { data: asset, error } = await supabase
      .from("assets")
      .insert({
        user_id: user.id,
        engine_key: engineKey,
        title: computedTitle,
        content,
        status: "draft",
      })
      .select()
      .single();

    setSaving(false);

    if (error || !asset) {
      toast({
        title: "Generation succeeded, save failed",
        description: error?.message ?? "Could not save asset.",
        variant: "destructive",
      });
      return;
    }

    await trackEvent("asset_created", { source: engineKey, asset_id: asset.id });

    setSavedAssetId(asset.id);
    toast({
      title: "Saved to assets",
      description: "Open Assets to schedule distribution.",
    });
  };

  const loadSample = () => {
    if (!sample) return;
    setValues({ ...initial, ...sample });
    setOutput(null);
    setSavedAssetId(null);
    toast({ title: "Sample loaded", description: "Tweak any field, then generate." });
  };

  const startNew = () => {
    setValues(initial);
    setOutput(null);
    setSavedAssetId(null);
  };

  return (
    <EngineLayout
      title={title}
      description={description}
      actions={
        <>
          {sample ? (
            <Button variant="outline" size="sm" onClick={loadSample}>
              Load sample
            </Button>
          ) : null}
          <Button size="sm" onClick={handleGenerate} disabled={!canGenerate || saving}>
            <Sparkles className="mr-2 h-4 w-4" />
            {saving ? "Generating…" : "Generate & save"}
          </Button>
        </>
      }
      aside={
        <PreviewCard
          title={output?.title || values[firstFieldKey ?? ""] || "Untitled"}
          status={savedAssetId ? "ready" : "draft"}
          meta={`${assetType} · ${engineKey}`}
        >
          {output ? (
            <pre className="whitespace-pre-wrap text-xs text-foreground">{output.content}</pre>
          ) : (
            <p className="text-xs text-muted-foreground">
              Fill in the fields and click Generate. Output is saved as an asset and ready for distribution.
            </p>
          )}
        </PreviewCard>
      }
    >
      {savedAssetId ? (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-foreground">
            Saved to assets. Next: schedule distribution.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a channel and date to plan when this goes out. Nothing posts automatically.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/assets">
                <Send className="mr-2 h-4 w-4" />
                Schedule distribution
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={startNew}>
              Start new
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
          <p className="font-medium">{intro}</p>
          <p className="mt-1 text-muted-foreground">
            Manual-first. Output is deterministic and editable in the asset view.
          </p>
        </div>
      )}

      <FormSection title="Inputs" description="These shape the generated output.">
        <div className="grid gap-4">
          {fields.map((f) =>
            f.textarea ? (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Textarea
                  id={f.key}
                  rows={3}
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </div>
            ) : (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </div>
            ),
          )}
        </div>
      </FormSection>

      {output ? (
        <FormSection title="Generated output" description="Saved as asset. Editable in the asset detail.">
          <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-xs text-foreground">
{output.content}
          </pre>
          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <Save className="h-3 w-3" />
            Stored in assets · engine_key={engineKey}
          </div>
        </FormSection>
      ) : null}
    </EngineLayout>
  );
}
