import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Save, Send, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { trackEvent } from "@/lib/analytics";
import { EngineLayout, FormSection, PreviewCard } from "@/components/engine";
import {
  GOAL_LABELS,
  LENGTH_LABELS,
  TONE_LABELS,
  formatScriptAsContent,
  generateVideoScript,
  type VideoForgeInput,
  type VideoForgeOutput,
  type VideoGoal,
  type VideoLength,
  type VideoTone,
} from "@/lib/video-forge";

const EMPTY: VideoForgeInput = {
  goal: "marketing",
  topic: "",
  audience: "",
  tone: "professional",
  length: "medium",
};

const SAMPLE: VideoForgeInput = {
  goal: "marketing",
  topic: "Cold email that actually books calls",
  audience: "B2B SaaS founders under $50k MRR",
  tone: "casual",
  length: "medium",
};

const VideoForge = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [fields, setFields] = useState<VideoForgeInput>(EMPTY);
  const [output, setOutput] = useState<VideoForgeOutput | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAssetId, setSavedAssetId] = useState<string | null>(null);

  const set = <K extends keyof VideoForgeInput>(key: K, value: VideoForgeInput[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const canGenerate = useMemo(() => fields.topic.trim().length > 0, [fields.topic]);

  const handleGenerate = async () => {
    if (!canGenerate || !user) return;
    setSaving(true);
    setSavedAssetId(null);

    const result = generateVideoScript(fields);
    setOutput(result);

    const content = formatScriptAsContent(result);

    const { data: asset, error } = await supabase
      .from("assets")
      .insert({
        user_id: user.id,
        engine_key: "video_forge",
        title: result.title || fields.topic,
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

    await trackEvent("video_forge_generated", {
      asset_id: asset.id,
      goal: fields.goal,
      tone: fields.tone,
      length: fields.length,
    });
    await trackEvent("asset_created", { source: "video_forge", asset_id: asset.id });

    setSavedAssetId(asset.id);
    toast({
      title: "Video script generated",
      description: "Saved to assets — ready to distribute.",
    });
  };

  const loadSample = () => {
    setFields(SAMPLE);
    setOutput(null);
    setSavedAssetId(null);
    toast({ title: "Sample loaded", description: "Tweak any field, then generate." });
  };

  const startNew = () => {
    setFields(EMPTY);
    setOutput(null);
    setSavedAssetId(null);
  };

  return (
    <EngineLayout
      title="Video Forge"
      description="Turn a topic into a structured video script in seconds. Hook, main points, CTA, captions, and hashtags — ready to record or distribute."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={loadSample}>
            <Wand2 className="mr-2 h-4 w-4" />
            Load sample
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={!canGenerate || saving}>
            <Sparkles className="mr-2 h-4 w-4" />
            {saving ? "Generating…" : "Generate video content"}
          </Button>
        </>
      }
      aside={
        <PreviewCard
          title={output?.title || fields.topic || "Untitled video"}
          status={savedAssetId ? "saved" : "draft"}
          meta={`${GOAL_LABELS[fields.goal]} · ${TONE_LABELS[fields.tone]} · ${LENGTH_LABELS[fields.length]}`}
        >
          {output ? (
            <>
              <p>
                <span className="font-medium text-foreground">Hook:</span>{" "}
                {output.hook}
              </p>
              <div>
                <p className="font-medium text-foreground">Main points</p>
                <ol className="mt-1 list-decimal pl-5">
                  {output.mainPoints.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ol>
              </div>
              <p>
                <span className="font-medium text-foreground">CTA:</span>{" "}
                {output.cta}
              </p>
              <p className="text-xs text-muted-foreground">
                {output.hashtags.join(" ")}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Fill in a topic and click Generate. The script appears here and is saved as an asset.
            </p>
          )}
        </PreviewCard>
      }
    >
      {savedAssetId ? (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-foreground">
            Script saved to assets. Next: schedule distribution.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a channel and date to plan when this video goes out. Nothing posts automatically.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/assets">
                <Send className="mr-2 h-4 w-4" />
                Schedule distribution
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={startNew}>
              Start a new script
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
          <p className="font-medium">Manual-first, instant output.</p>
          <p className="mt-1 text-muted-foreground">
            Pick a goal, type a topic, click Generate. The script is deterministic and editable in the asset view.
          </p>
        </div>
      )}

      <FormSection title="What's the video?" description="Goal and topic shape every line below.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="goal">Goal</Label>
            <Select value={fields.goal} onValueChange={(v) => set("goal", v as VideoGoal)}>
              <SelectTrigger id="goal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(GOAL_LABELS) as VideoGoal[]).map((g) => (
                  <SelectItem key={g} value={g}>
                    {GOAL_LABELS[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="topic">Topic / idea</Label>
            <Input
              id="topic"
              placeholder="e.g. Cold email that actually books calls"
              value={fields.topic}
              onChange={(e) => set("topic", e.target.value)}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Audience & style" description="Who's watching, and how should it feel?">
        <div className="space-y-2">
          <Label htmlFor="audience">Target audience</Label>
          <Input
            id="audience"
            placeholder="e.g. B2B SaaS founders under $50k MRR"
            value={fields.audience}
            onChange={(e) => set("audience", e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tone">Tone / style</Label>
            <Select value={fields.tone} onValueChange={(v) => set("tone", v as VideoTone)}>
              <SelectTrigger id="tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TONE_LABELS) as VideoTone[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TONE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="length">Length</Label>
            <Select value={fields.length} onValueChange={(v) => set("length", v as VideoLength)}>
              <SelectTrigger id="length">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LENGTH_LABELS) as VideoLength[]).map((l) => (
                  <SelectItem key={l} value={l}>
                    {LENGTH_LABELS[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSection>

      {output ? (
        <FormSection title="Generated script" description="Editable in the asset detail. This is the source of truth.">
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title</p>
              <p className="mt-1 text-foreground">{output.title}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hook</p>
              <p className="mt-1 text-foreground">{output.hook}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Main points</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-foreground">
                {output.mainPoints.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CTA</p>
              <p className="mt-1 text-foreground">{output.cta}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Captions</p>
              <pre className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-xs text-foreground">
{output.captions}
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hashtags</p>
              <p className="mt-1 text-foreground">{output.hashtags.join(" ")}</p>
            </div>
          </div>
        </FormSection>
      ) : null}
    </EngineLayout>
  );
};

export default VideoForge;
