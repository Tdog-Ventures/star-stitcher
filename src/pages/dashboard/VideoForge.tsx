import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Save, Send, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  FORMAT_LABELS,
  GOAL_LABELS,
  LENGTH_LABELS,
  MODE_LABELS,
  PLATFORM_LABELS,
  TONE_LABELS,
  formatVideoForge,
  generateVideoForge,
  type VideoForgeInput,
  type VideoForgeOutput,
  type VideoFormat,
  type VideoGoal,
  type VideoLength,
  type VideoMode,
  type VideoPlatform,
  type VideoTone,
} from "@/lib/video-forge";
import { buildEnvelope } from "@/lib/engines/contracts";

const EMPTY: VideoForgeInput = {
  video_goal: "marketing",
  topic: "",
  target_audience: "",
  platform: "youtube",
  format: "short_form",
  tone: "professional",
  target_length: "medium",
  desired_outcome: "",
  mode: "short_form",
};

const SAMPLE: VideoForgeInput = {
  video_goal: "marketing",
  topic: "Cold email that actually books calls",
  target_audience: "B2B SaaS founders under $50k MRR",
  platform: "tiktok",
  format: "short_form",
  tone: "bold",
  target_length: "short",
  desired_outcome: "Send one email today that gets a reply",
  mode: "short_form",
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

    const result = generateVideoForge(fields);
    setOutput(result);

    const markdown = formatVideoForge(fields, result);
    const content = buildEnvelope("video_forge", result, markdown);

    const { data: asset, error } = await supabase
      .from("assets")
      .insert({
        user_id: user.id,
        engine_key: "video_forge",
        title: result.video_title,
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
      goal: fields.video_goal,
      tone: fields.tone,
      length: fields.target_length,
      platform: fields.platform,
      format: fields.format,
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
      description="The core engine. Turn an idea into a structured video concept, script, scenes, captions, thumbnails, and a distribution plan — instantly."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={loadSample}>
            <Wand2 className="mr-2 h-4 w-4" />
            Load sample
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={!canGenerate || saving}>
            <Sparkles className="mr-2 h-4 w-4" />
            {saving ? "Generating…" : "Generate video"}
          </Button>
        </>
      }
      aside={
        <PreviewCard
          title={output?.video_title || fields.topic || "Untitled video"}
          status={savedAssetId ? "ready" : "draft"}
          meta={`${GOAL_LABELS[fields.video_goal]} · ${PLATFORM_LABELS[fields.platform]} · ${LENGTH_LABELS[fields.target_length]}`}
        >
          {output ? (
            <>
              <p>
                <span className="font-medium text-foreground">Hook:</span>{" "}
                {output.opening_hook}
              </p>
              <p>
                <span className="font-medium text-foreground">Promise:</span>{" "}
                {output.viewer_promise}
              </p>
              <p className="text-xs text-muted-foreground">
                {output.scene_breakdown.length} scenes · {output.hashtags.slice(0, 4).join(" ")}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Fill in a topic and click Generate. The full video plan appears here and is saved as an asset.
            </p>
          )}
        </PreviewCard>
      }
    >
      {savedAssetId ? (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-foreground">
            Video plan saved to assets. Next: schedule distribution.
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
              Start a new video
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
          <p className="font-medium">Manual-first, instant output.</p>
          <p className="mt-1 text-muted-foreground">
            Fill the form, hit Generate. The plan is deterministic and editable in the asset view.
          </p>
        </div>
      )}

      <FormSection title="What's the video?" description="Goal and topic shape every line below.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="video_goal">Goal</Label>
            <Select value={fields.video_goal} onValueChange={(v) => set("video_goal", v as VideoGoal)}>
              <SelectTrigger id="video_goal">
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
        <div className="space-y-2">
          <Label htmlFor="target_audience">Target audience</Label>
          <Input
            id="target_audience"
            placeholder="e.g. B2B SaaS founders under $50k MRR"
            value={fields.target_audience}
            onChange={(e) => set("target_audience", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desired_outcome">Desired outcome</Label>
          <Textarea
            id="desired_outcome"
            rows={2}
            placeholder="What should the viewer be able to do after watching?"
            value={fields.desired_outcome}
            onChange={(e) => set("desired_outcome", e.target.value)}
          />
        </div>
      </FormSection>

      <FormSection title="Format & style" description="Where it runs and how it feels.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select value={fields.platform} onValueChange={(v) => set("platform", v as VideoPlatform)}>
              <SelectTrigger id="platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PLATFORM_LABELS) as VideoPlatform[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PLATFORM_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select value={fields.format} onValueChange={(v) => set("format", v as VideoFormat)}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FORMAT_LABELS) as VideoFormat[]).map((f) => (
                  <SelectItem key={f} value={f}>
                    {FORMAT_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            <Label htmlFor="target_length">Length</Label>
            <Select value={fields.target_length} onValueChange={(v) => set("target_length", v as VideoLength)}>
              <SelectTrigger id="target_length">
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
        <FormSection title="Generated video plan" description="Saved as asset. Open the asset to edit.">
          <div className="space-y-4 text-sm">
            <Section label="Title">{output.video_title}</Section>
            <Section label="Core angle">{output.core_angle}</Section>
            <Section label="Viewer promise">{output.viewer_promise}</Section>
            <Section label="Opening hook">{output.opening_hook}</Section>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Script sections
              </p>
              <dl className="mt-1 space-y-1 text-foreground">
                {(Object.entries(output.script_sections) as [string, string][]).map(([k, v]) => (
                  <div key={k}>
                    <dt className="inline font-medium capitalize">{k.replace(/_/g, " ")}: </dt>
                    <dd className="inline">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Scene breakdown ({output.scene_breakdown.length})
              </p>
              <ol className="mt-1 list-decimal space-y-2 pl-5 text-foreground">
                {output.scene_breakdown.map((s) => (
                  <li key={s.scene_number}>
                    <span className="font-medium">{s.scene_purpose}:</span> {s.suggested_visual}
                    {s.on_screen_text ? (
                      <span className="ml-1 text-muted-foreground">
                        — overlay "{s.on_screen_text}"
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Captions
              </p>
              <pre className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-xs text-foreground">
{output.captions.short_caption}
              </pre>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Thumbnail concepts
              </p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-foreground">
                {output.thumbnail_concepts.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            </div>

            <Section label="Hashtags">{output.hashtags.join(" ")}</Section>
            <Section label="Distribution">{output.distribution_recommendation}</Section>
            <Section label="Success metric">{output.success_metric}</Section>

            <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
              <Save className="h-3 w-3" />
              Stored in assets · engine_key=video_forge
            </div>
          </div>
        </FormSection>
      ) : null}
    </EngineLayout>
  );
};

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-foreground">{children}</p>
  </div>
);

export default VideoForge;
