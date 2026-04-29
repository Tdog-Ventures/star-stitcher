import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Save, Send, Sparkles, Wand2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  VideoForgeHistory,
  type ForgeVariant,
  type VideoForgeHistoryEntry,
} from "@/components/engine/VideoForgeHistory";
import {
  FORMAT_LABELS,
  GOAL_LABELS,
  LENGTH_LABELS,
  MODE_LABELS,
  PLATFORM_LABELS,
  TONE_LABELS,
  formatVideoForge,
  generateVideoForge,
  validateVideoForgeOutput,
  type VideoForgeInput,
  type VideoForgeOutput,
  type VideoForgeValidationIssue,
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
  const [validationIssues, setValidationIssues] = useState<VideoForgeValidationIssue[]>([]);
  const [history, setHistory] = useState<VideoForgeHistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ForgeVariant>("deterministic");

  const set = <K extends keyof VideoForgeInput>(key: K, value: VideoForgeInput[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const canGenerate = useMemo(() => fields.topic.trim().length > 0, [fields.topic]);

  const handleGenerate = async () => {
    if (!canGenerate || !user) return;
    setSaving(true);
    setSavedAssetId(null);
    setValidationIssues([]);

    const draft = generateVideoForge(fields);
    setOutput(draft);

    // Polish pass: rewrite narration via DeepSeek so each scene is genuinely
    // about the topic. Falls back to the deterministic draft on any failure
    // or timeout (15s end-to-end), so the form never hangs.
    let result = draft;
    try {
      const polishPromise = supabase.functions.invoke("video-forge-polish", {
        body: { input: fields, draft },
      });
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(
          () => resolve({ data: null, error: new Error("polish timeout") }),
          15_000,
        ),
      );
      const { data, error } = (await Promise.race([
        polishPromise,
        timeoutPromise,
      ])) as { data: VideoForgeOutput | null; error: unknown };
      if (!error && data && Array.isArray((data as VideoForgeOutput).scene_breakdown)) {
        result = data as VideoForgeOutput;
        setOutput(result);
      }
    } catch (e) {
      console.warn("[video-forge] polish skipped", e);
    }

    // Pre-save validation: every required output field must be present and
    // non-empty, and every scene must carry the production fields.
    const validation = validateVideoForgeOutput(result);
    if (!validation.ok) {
      setSaving(false);
      setValidationIssues(validation.issues);
      toast({
        title: "Video plan is incomplete — not saved",
        description: `${validation.issues.length} issue${validation.issues.length === 1 ? "" : "s"} found. See the validation panel below.`,
        variant: "destructive",
      });
      return;
    }

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
    setValidationIssues([]);
    toast({ title: "Sample loaded", description: "Tweak any field, then generate." });
  };

  const startNew = () => {
    setFields(EMPTY);
    setOutput(null);
    setSavedAssetId(null);
    setValidationIssues([]);
  };

  return (
    <EngineLayout
      title="Video Forge"
      description="Turn an idea into a production-ready video plan — script, scenes, captions, thumbnails, and a distribution playbook. Rendered MP4 export coming next."
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
      {validationIssues.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            Save blocked — {validationIssues.length} issue
            {validationIssues.length === 1 ? "" : "s"} to fix
          </AlertTitle>
          <AlertDescription>
            <p className="mb-2 text-sm">
              The video plan was generated but not saved. Fix the items below
              (or tweak the form and regenerate) before this can be saved as an
              asset.
            </p>
            <ul className="space-y-2">
              {validationIssues.map((issue, i) => (
                <li
                  key={`${issue.path}-${i}`}
                  className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs"
                >
                  <code className="block font-mono text-[11px] font-semibold text-foreground">
                    {issue.path}
                  </code>
                  <p className="mt-1 text-foreground">{issue.reason}</p>
                  <p className="mt-1 text-muted-foreground">
                    <span className="font-medium text-foreground">Fix: </span>
                    {issue.fix}
                  </p>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

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

      <FormSection title="Output mode" description="Pick the kind of script you want generated.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="mode">Mode</Label>
            <Select
              value={fields.mode ?? "short_form"}
              onValueChange={(v) => set("mode", v as VideoMode)}
            >
              <SelectTrigger id="mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MODE_LABELS) as VideoMode[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {MODE_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Short-form, long-form YouTube, faceless, or product demo. Each mode changes the hook, scene plan, voiceover notes, and success metric.
            </p>
          </div>
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
        <FormSection
          title={`Generated ${MODE_LABELS[output.mode].toLowerCase()}`}
          description="Saved as asset. Open the asset to edit."
        >
          <div className="space-y-4 text-sm">
            <Section label="Title">{output.video_title}</Section>
            <Section label="Core angle">{output.core_angle}</Section>
            <Section label="Viewer promise">{output.viewer_promise}</Section>
            <Section label="Opening hook">{output.opening_hook}</Section>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Full script
              </p>
              <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-xs text-foreground">
{output.full_script}
              </pre>
            </div>

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
              <ol className="mt-2 space-y-3">
                {output.scene_breakdown.map((s) => {
                  const range = s.end_timecode
                    ? `${s.timecode} → ${s.end_timecode}`
                    : s.timecode;
                  const dur =
                    typeof s.duration_seconds === "number"
                      ? `${s.duration_seconds}s`
                      : null;
                  return (
                    <li
                      key={s.scene_number}
                      className="rounded-md border border-border bg-card p-3"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Scene {s.scene_number}
                          </span>
                          <span className="font-mono text-sm font-medium text-foreground">
                            {range}
                          </span>
                          {dur ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {dur}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {s.scene_purpose}
                        </span>
                      </div>
                      <dl className="mt-3 grid gap-2 text-xs">
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Narration
                          </dt>
                          <dd className="mt-0.5 text-foreground">{s.narration}</dd>
                        </div>
                        {s.on_screen_text ? (
                          <div>
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              On-screen text
                            </dt>
                            <dd className="mt-0.5 text-foreground">"{s.on_screen_text}"</dd>
                          </div>
                        ) : null}
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Suggested visual
                          </dt>
                          <dd className="mt-0.5 text-muted-foreground">
                            {s.suggested_visual}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Stock / B-roll
                          </dt>
                          <dd className="mt-0.5">
                            <code className="text-muted-foreground">
                              {s.b_roll_or_stock_query}
                            </code>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Voiceover note
                          </dt>
                          <dd className="mt-0.5 text-muted-foreground">
                            {s.voiceover_note}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Stock footage / B-roll search terms
              </p>
              <ul className="mt-1 list-disc pl-5 text-foreground">
                {output.stock_footage_terms.map((t, i) => (
                  <li key={i}><code className="text-xs">{t}</code></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                On-screen text overlays
              </p>
              <ol className="mt-1 list-decimal pl-5 text-foreground">
                {output.on_screen_text_overlays.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Voiceover notes
              </p>
              <ul className="mt-1 list-disc pl-5 text-foreground">
                {output.voiceover_notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
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
              Stored in assets · engine_key=video_forge · mode={output.mode}
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
