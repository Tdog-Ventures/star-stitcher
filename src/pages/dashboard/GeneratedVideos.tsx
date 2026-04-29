import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Ban,
  Download,
  Eye,
  FileText,
  Film,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Subtitles,
  Video as VideoIcon,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  CHANNELS,
  distributeFormSchema,
  type Channel,
} from "@/lib/distribution";
import {
  EngineLayout,
  AssetPreviewRenderer,
  StatusBadge,
  type EngineStatus,
} from "@/components/engine";
import { tryParseEnvelope } from "@/lib/engines/contracts";

import { deriveRenderUi } from "@/lib/render-state";
import {
  buildRenderPayload,
  RENDER_ENGINES,
  RENDER_ENGINE_LABEL,
  type RenderEngine,
} from "@/lib/video-forge";

interface AssetRecord {
  id: string;
  title: string;
  engine_key: string;
  channel: string | null;
  status: string;
  source_record_id: string | null;
  created_at: string;
  updated_at: string;
  content: string | null;
  render_job_id: string | null;
  rendered_video_url: string | null;
  render_status: string | null;
  render_engine: string | null;
}

interface TaskLite {
  id: string;
  asset_id: string | null;
  status: string;
  channel: string;
  scheduled_at: string | null;
  sent_at: string | null;
}

interface VideoForgeMeta {
  mode?: string;
  platform?: string;
  scenes: number;
  durationSeconds: number | null;
  fullScript: string;
  shortCaption: string;
  longCaption: string;
}

const MODE_LABEL: Record<string, string> = {
  short_form: "Short-form",
  long_form: "Long-form",
  faceless: "Faceless",
  product_demo: "Product demo",
};

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function extractMeta(content: string | null): VideoForgeMeta {
  const empty: VideoForgeMeta = {
    scenes: 0,
    durationSeconds: null,
    fullScript: "",
    shortCaption: "",
    longCaption: "",
  };
  const env = tryParseEnvelope(content);
  if (!env) return empty;
  const o = env.output as Record<string, unknown>;
  const scenes = Array.isArray(o.scene_breakdown) ? (o.scene_breakdown as Array<Record<string, unknown>>) : [];
  let duration: number | null = null;
  if (scenes.length) {
    const total = scenes.reduce((acc, s) => {
      const n = typeof s.duration_seconds === "number" ? s.duration_seconds : 0;
      return acc + n;
    }, 0);
    if (total > 0) duration = total;
  }
  const captions = (o.captions ?? {}) as Record<string, string>;
  return {
    mode: typeof o.mode === "string" ? o.mode : undefined,
    scenes: scenes.length,
    durationSeconds: duration,
    fullScript: typeof o.full_script === "string" ? o.full_script : "",
    shortCaption: typeof captions.short_caption === "string" ? captions.short_caption : "",
    longCaption: typeof captions.long_caption === "string" ? captions.long_caption : "",
  };
}

function downloadText(filename: string, body: string) {
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function safeName(title: string): string {
  return (title || "video").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

/**
 * Map a Generated Video into a top-level state badge:
 *   - Posted        -> any linked task is completed
 *   - Scheduled     -> any linked task is scheduled / queued / running
 *   - Render pending -> reserved for future rendered MP4 export
 *   - Script ready  -> default for any saved video_forge asset
 */
function videoBadge(asset: AssetRecord, tasks: TaskLite[]): { label: string; status: EngineStatus } {
  const linked = tasks.filter((t) => t.asset_id === asset.id);
  if (linked.some((t) => t.status === "completed" || !!t.sent_at)) {
    return { label: "Posted", status: "sent" };
  }
  if (linked.some((t) => t.status === "queued" || t.status === "running" || !!t.scheduled_at)) {
    return { label: "Scheduled", status: "scheduled" };
  }
  return { label: "Script ready", status: "ready" };
}

const GeneratedVideos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<AssetRecord[]>([]);
  const [tasks, setTasks] = useState<TaskLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // distribute modal
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AssetRecord | null>(null);
  const [channel, setChannel] = useState<Channel | "">("");
  const [campaignName, setCampaignName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<AssetRecord | null>(null);

  // render integration (FacelessForge — LIVE)
  const [polling, setPolling] = useState<Set<string>>(new Set());
  const [renderingNow, setRenderingNow] = useState<Set<string>>(new Set());
  const [cancellingNow, setCancellingNow] = useState<Set<string>>(new Set());
  // Live progress per asset_id. `reported` is the latest 0-100 from upstream
  // (null = upstream hasn't given us a number yet). `startedAt` lets us draw
  // a smooth fallback curve so the bar is never frozen at 0.
  const [progressByAsset, setProgressByAsset] = useState<
    Record<string, { reported: number | null; startedAt: number }>
  >({});
  // Per-row engine selector for the manual render flow. Defaults to videoforge.
  const [engineByAsset, setEngineByAsset] = useState<Record<string, RenderEngine>>({});
  const [tick, setTick] = useState(0); // re-render every second for fallback curve
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const [{ data, error }, { data: taskData }] = await Promise.all([
      supabase
        .from("assets")
        .select(
          "id, title, engine_key, channel, status, source_record_id, created_at, updated_at, content, render_job_id, rendered_video_url, render_status, render_engine",
        )
        .eq("engine_key", "video_forge")
        .order("created_at", { ascending: false }),
      supabase
        .from("distribution_tasks")
        .select("id, asset_id, status, channel, scheduled_at, sent_at"),
    ]);
    if (error) setError(error.message);
    else setRows((data ?? []) as unknown as AssetRecord[]);
    setTasks(taskData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const defaultScheduled = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return toLocalInput(d);
  }, []);

  const openDistribute = (rec: AssetRecord) => {
    setSelected(rec);
    setChannel("");
    setCampaignName("");
    setScheduledAt(defaultScheduled);
    setNotes("");
    setErrors({});
    setOpen(true);
  };

  const openPreview = (rec: AssetRecord) => {
    setPreviewAsset(rec);
    setPreviewOpen(true);
  };

  // ---------------------------------------------------------------------------
  // FacelessForge render integration (STUB)
  //
  // The /videos page never calls FacelessForge directly. It always invokes
  // our edge functions, which act as the proxy boundary. While the secret
  // FACELESSFORGE_API_KEY is unset / "stub-not-connected", those edge functions
  // return fake data and never write a video URL onto the asset — so this UI
  // can never claim an MP4 exists.
  // ---------------------------------------------------------------------------

  // Resume polling for any in-flight jobs after a page reload. Also seed
  // a startedAt timestamp per asset so the fallback progress curve has an
  // anchor when upstream doesn't report a real percentage.
  useEffect(() => {
    if (!rows.length) return;
    setPolling((prev) => {
      const next = new Set(prev);
      for (const r of rows) {
        if (r.render_job_id && !r.rendered_video_url) next.add(r.id);
      }
      return next;
    });
    setProgressByAsset((prev) => {
      const next = { ...prev };
      const now = Date.now();
      for (const r of rows) {
        const inFlight = !!r.render_job_id && !r.rendered_video_url &&
          r.render_status !== "failed" && r.render_status !== "cancelled";
        if (inFlight && !next[r.id]) {
          next[r.id] = { reported: null, startedAt: now };
        }
        if (r.rendered_video_url && next[r.id]) {
          next[r.id] = { ...next[r.id], reported: 100 };
        }
      }
      return next;
    });
  }, [rows]);

  // Drive a 1s tick so the fallback progress curve animates while we wait
  // for the next 5s status poll. Only runs while at least one job is in flight.
  useEffect(() => {
    if (polling.size === 0) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [polling.size]);

  // Single interval that polls every in-flight job, stops when none are left.
  useEffect(() => {
    if (polling.size === 0) {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      return;
    }
    if (pollTimer.current) return; // already running
    pollTimer.current = setInterval(async () => {
      const ids = Array.from(polling);
      for (const id of ids) {
        const row = rows.find((r) => r.id === id);
        if (!row?.render_job_id) {
          setPolling((p) => {
            const n = new Set(p);
            n.delete(id);
            return n;
          });
          continue;
        }
        const { data, error } = await supabase.functions.invoke("render-video-status", {
          body: { job_id: row.render_job_id, asset_id: row.id },
        });
        if (error) continue;
        const payload = (data ?? {}) as { status?: string; progress?: number | null };
        const status = payload.status;
        if (typeof payload.progress === "number") {
          const pct = Math.max(0, Math.min(100, Math.round(payload.progress)));
          setProgressByAsset((prev) => ({
            ...prev,
            [id]: { reported: pct, startedAt: prev[id]?.startedAt ?? Date.now() },
          }));
        }
        if (status === "completed" || status === "failed" || status === "cancelled") {
          if (status === "completed") {
            setProgressByAsset((prev) => ({
              ...prev,
              [id]: { reported: 100, startedAt: prev[id]?.startedAt ?? Date.now() },
            }));
          }
          setPolling((p) => {
            const n = new Set(p);
            n.delete(id);
            return n;
          });
          // Re-load the asset so any new rendered_video_url surfaces.
          await load();
        }
      }
    }, 5000);
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling.size]);

  // Compute the bar value for a given asset. Prefer the upstream-reported
  // number; otherwise draw a smooth curve from elapsed time, capped at 95%
  // so we never look "done" before the upstream actually says so.
  const getProgressForAsset = (assetId: string): { value: number; reported: boolean } => {
    const entry = progressByAsset[assetId];
    if (!entry) return { value: 0, reported: false };
    if (entry.reported !== null) return { value: entry.reported, reported: true };
    const elapsed = (Date.now() - entry.startedAt) / 1000; // seconds
    // Asymptotic curve: 0→95 over ~90s, slows after.
    const v = Math.min(95, Math.round(95 * (1 - Math.exp(-elapsed / 30))));
    return { value: v, reported: false };
  };
  // Touch `tick` so this re-renders every second while polling.
  void tick;

  const handleRender = async (rec: AssetRecord, meta: VideoForgeMeta) => {
    if (!user) return;
    if (renderingNow.has(rec.id)) return;
    setRenderingNow((s) => new Set(s).add(rec.id));

    // Build the render payload from the active envelope. Same shape as the
    // Video Forge auto-render fires after Generate.
    const env = tryParseEnvelope(rec.content);
    const output = (env?.output ?? null) as Parameters<typeof buildRenderPayload>[1] | null;
    if (!output) {
      setRenderingNow((s) => {
        const n = new Set(s);
        n.delete(rec.id);
        return n;
      });
      toast({
        title: "Render request failed",
        description: "Could not parse the script envelope for this asset.",
        variant: "destructive",
      });
      return;
    }
    // Title comes from the asset row (user-editable), so override after build.
    const engine = engineByAsset[rec.id] ?? (rec.render_engine as RenderEngine | null) ?? "videoforge";
    const body = { ...buildRenderPayload(rec.id, output, engine), title: rec.title, script: meta.fullScript };

    const { data, error } = await supabase.functions.invoke("render-video", {
      body,
    });

    setRenderingNow((s) => {
      const n = new Set(s);
      n.delete(rec.id);
      return n;
    });

    if (error) {
      toast({
        title: "Render request failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    const payload = (data ?? {}) as { job_id?: string; render_job_id?: string };
    const jobId = payload.job_id ?? payload.render_job_id;
    if (!jobId) {
      toast({
        title: "No job id returned",
        description: "FacelessForge did not return a job id.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Render queued",
      description: `Job ${jobId}`,
    });
    setPolling((p) => new Set(p).add(rec.id));
    await load();
  };

  const handleRetry = async (rec: AssetRecord, meta: VideoForgeMeta) => {
    if (!user) return;
    // Reset render columns so the row goes back to "idle" before re-submitting.
    await supabase
      .from("assets")
      .update({ render_job_id: null, rendered_video_url: null, render_status: null })
      .eq("id", rec.id);
    await load();
    await handleRender({ ...rec, render_job_id: null, rendered_video_url: null, render_status: null }, meta);
  };

  const handleCancel = async (rec: AssetRecord) => {
    if (!user || !rec.render_job_id) return;
    if (cancellingNow.has(rec.id)) return;
    setCancellingNow((s) => new Set(s).add(rec.id));

    const { data, error } = await supabase.functions.invoke("render-video-cancel", {
      body: { job_id: rec.render_job_id, asset_id: rec.id },
    });

    setCancellingNow((s) => {
      const n = new Set(s);
      n.delete(rec.id);
      return n;
    });

    if (error) {
      toast({
        title: "Cancel failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    const payload = (data ?? {}) as {
      status?: string;
      already_terminal?: boolean;
      rendered_video_url?: string | null;
    };
    const finalStatus = payload.status ?? "cancelled";

    // Optimistic UI: reflect final state immediately.
    setRows((prev) =>
      prev.map((r) =>
        r.id === rec.id
          ? {
              ...r,
              render_status: finalStatus,
              rendered_video_url: payload.rendered_video_url ?? r.rendered_video_url,
            }
          : r,
      ),
    );

    // Stop polling for this asset — terminal state reached.
    setPolling((p) => {
      const n = new Set(p);
      n.delete(rec.id);
      return n;
    });

    if (payload.already_terminal) {
      toast({
        title: "Already finished",
        description: `Job already ${finalStatus}, nothing to cancel.`,
      });
    } else {
      toast({
        title: "Render cancelled",
        description: `Job ${rec.render_job_id} cancelled.`,
      });
    }
    await load();
  };


  const submit = async () => {
    if (!user || !selected) return;
    const parsed = distributeFormSchema.safeParse({
      channel,
      campaignName,
      scheduledAt,
      notes: notes || undefined,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join(".")] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const { data: task, error } = await supabase
      .from("distribution_tasks")
      .insert({
        user_id: user.id,
        asset_id: selected.id,
        linked_offer_id: selected.source_record_id ?? null,
        channel: parsed.data.channel,
        campaign_name: parsed.data.campaignName,
        task_title: selected.title,
        task_content: null,
        scheduled_at: new Date(parsed.data.scheduledAt).toISOString(),
        notes: parsed.data.notes ?? null,
        status: "queued",
      })
      .select()
      .single();
    setSubmitting(false);
    if (error || !task) {
      toast({ title: "Could not create task", description: error?.message, variant: "destructive" });
      return;
    }
    await trackEvent("distribution_task_created", {
      asset_id: selected.id,
      channel: parsed.data.channel,
      campaign_name: parsed.data.campaignName,
      scheduled_at: parsed.data.scheduledAt,
      source: "generated_videos",
    });
    toast({ title: "Queued for distribution", description: `${parsed.data.channel} · ${parsed.data.campaignName}` });
    setOpen(false);
    load();
  };

  const handleDownloadScript = (rec: AssetRecord, meta: VideoForgeMeta) => {
    if (!meta.fullScript) {
      toast({
        title: "No script to export",
        description: "This asset has no full_script field.",
        variant: "destructive",
      });
      return;
    }
    downloadText(`${safeName(rec.title)}__script.txt`, meta.fullScript);
  };

  const handleDownloadCaptions = (rec: AssetRecord, meta: VideoForgeMeta) => {
    const body = [
      meta.shortCaption ? `# Short caption\n\n${meta.shortCaption}` : "",
      meta.longCaption ? `# Long caption\n\n${meta.longCaption}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    if (!body) {
      toast({
        title: "No captions to export",
        description: "This asset has no captions yet.",
        variant: "destructive",
      });
      return;
    }
    downloadText(`${safeName(rec.title)}__captions.txt`, body);
  };

  return (
    <EngineLayout
      title="Generated Videos"
      description="Every video plan you've generated with Video Forge. Download the script and captions, schedule distribution, or open the full asset. Rendered video export coming next."
      actions={
        <Button asChild size="sm">
          <Link to="/engines/video-forge">
            <Plus className="mr-2 h-4 w-4" />
            New video
          </Link>
        </Button>
      }
    >
      {loading ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load videos: {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No generated videos yet.{" "}
          <Link to="/engines/video-forge" className="text-primary underline-offset-4 hover:underline">
            Open Video Forge
          </Link>{" "}
          to create your first one.
        </div>
      ) : (
        <div className="grid gap-3" data-testid="video-grid">
          {rows.map((rec) => {
            const meta = extractMeta(rec.content);
            const badge = videoBadge(rec, tasks);
            const duration = formatDuration(meta.durationSeconds);
            const modeLabel = meta.mode ? MODE_LABEL[meta.mode] ?? meta.mode : null;
            const platform = rec.channel ?? null;
            return (
              <Card key={rec.id} data-testid="video-card">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <VideoIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                      <h3 className="truncate text-sm font-semibold text-foreground">{rec.title}</h3>
                      <Badge variant="outline" className="text-[10px]">
                        {badge.label}
                      </Badge>
                      <StatusBadge status={badge.status} className="text-[10px]" />
                      {rec.render_engine ? (
                        <Badge
                          variant="outline"
                          className="border-primary/40 bg-primary/10 text-[10px] text-primary"
                          data-testid="engine-chip"
                        >
                          {RENDER_ENGINE_LABEL[rec.render_engine as RenderEngine] ?? rec.render_engine}
                        </Badge>
                      ) : null}
                    </div>
                    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {modeLabel ? (
                        <Meta label="Mode" value={modeLabel} />
                      ) : null}
                      {platform ? <Meta label="Platform" value={platform} /> : null}
                      <Meta label="Scenes" value={String(meta.scenes || "—")} />
                      {duration ? <Meta label="Duration" value={duration} /> : null}
                      <Meta label="Created" value={new Date(rec.created_at).toLocaleDateString()} />
                      <Meta label="Status" value={rec.status} />
                    </dl>
                    {(() => {
                      const renderUi = deriveRenderUi(rec);
                      if (renderUi === "complete") {
                        return (
                          <p className="text-[11px] text-muted-foreground">
                            <Sparkles className="mr-1 inline h-3 w-3" aria-hidden="true" />
                            MP4 attached — rendered by FacelessForge.
                          </p>
                        );
                      }
                      if (renderUi === "rendering") {
                        const { value, reported } = getProgressForAsset(rec.id);
                        return (
                          <div className="space-y-1.5" data-testid="render-progress">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                Rendering with FacelessForge
                                {rec.render_job_id ? (
                                  <span className="font-mono text-muted-foreground/70">
                                    {" "}· job {rec.render_job_id.slice(0, 10)}
                                  </span>
                                ) : null}
                              </span>
                              <span
                                className="flex items-center gap-1.5 tabular-nums font-medium text-primary"
                                data-testid="render-progress-value"
                              >
                                {value}%
                                {reported ? null : (
                                  <Badge
                                    variant="outline"
                                    className="border-muted-foreground/30 px-1 py-0 text-[9px] font-normal text-muted-foreground"
                                  >
                                    est.
                                  </Badge>
                                )}
                              </span>
                            </div>
                            <Progress value={value} className="h-2" />
                            <p className="text-[10px] text-muted-foreground/80">
                              {reported
                                ? "Live progress reported by FacelessForge."
                                : "Waiting for live updates — showing an estimate based on elapsed time."}
                            </p>
                          </div>
                        );
                      }
                      if (renderUi === "failed") {
                        return (
                          <p className="text-[11px] text-destructive">
                            <AlertTriangle className="mr-1 inline h-3 w-3" aria-hidden="true" />
                            Render failed. Try again.
                          </p>
                        );
                      }
                      if (renderUi === "cancelled") {
                        return (
                          <p className="text-[11px] text-muted-foreground">
                            <Ban className="mr-1 inline h-3 w-3" aria-hidden="true" />
                            Render cancelled. You can start a new render.
                          </p>
                        );
                      }
                      return (
                        <p className="text-[11px] text-muted-foreground">
                          <Film className="mr-1 inline h-3 w-3" aria-hidden="true" />
                          Render this script into an MP4 with FacelessForge.
                        </p>
                      );
                    })()}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openPreview(rec)}>
                      <Eye className="mr-2 h-3.5 w-3.5" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadScript(rec, meta)}
                    >
                      <FileText className="mr-2 h-3.5 w-3.5" />
                      Script
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadCaptions(rec, meta)}
                    >
                      <Subtitles className="mr-2 h-3.5 w-3.5" />
                      Captions
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDistribute(rec)}>
                      <Send className="mr-2 h-3.5 w-3.5" />
                      Schedule
                    </Button>
                    {(() => {
                      const renderUi = deriveRenderUi(rec);
                      const isSubmitting = renderingNow.has(rec.id);
                      const isCancelling = cancellingNow.has(rec.id);
                      if (renderUi === "complete" && rec.rendered_video_url) {
                        return (
                          <Button asChild size="sm" variant="default">
                            <a
                              href={rec.rendered_video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid="download-mp4"
                            >
                              <Download className="mr-2 h-3.5 w-3.5" />
                              Download MP4
                            </a>
                          </Button>
                        );
                      }
                      if (renderUi === "rendering") {
                        return (
                          <>
                            <Button size="sm" variant="outline" disabled data-testid="render-pending">
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              Rendering…
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancel(rec)}
                              disabled={isCancelling}
                              data-testid="render-cancel"
                            >
                              {isCancelling ? (
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <XCircle className="mr-2 h-3.5 w-3.5" />
                              )}
                              Cancel render
                            </Button>
                          </>
                        );
                      }
                      if (renderUi === "failed" || renderUi === "cancelled") {
                        return (
                          <Button
                            size="sm"
                            variant={renderUi === "failed" ? "destructive" : "outline"}
                            onClick={() => handleRetry(rec, meta)}
                            disabled={isSubmitting}
                            data-testid={renderUi === "failed" ? "render-retry" : "render-restart"}
                          >
                            {isSubmitting ? (
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : renderUi === "failed" ? (
                              <AlertTriangle className="mr-2 h-3.5 w-3.5" />
                            ) : (
                              <Film className="mr-2 h-3.5 w-3.5" />
                            )}
                            {renderUi === "failed" ? "Retry render" : "Render again"}
                          </Button>
                        );
                      }
                      const currentEngine: RenderEngine =
                        engineByAsset[rec.id] ?? (rec.render_engine as RenderEngine | null) ?? "videoforge";
                      return (
                        <>
                          <Select
                            value={currentEngine}
                            onValueChange={(v) =>
                              setEngineByAsset((prev) => ({ ...prev, [rec.id]: v as RenderEngine }))
                            }
                          >
                            <SelectTrigger
                              className="h-8 w-[140px] text-xs"
                              aria-label="Render engine"
                              data-testid="engine-select"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {RENDER_ENGINES.map((e) => (
                                <SelectItem key={e.value} value={e.value} className="text-xs">
                                  {e.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRender(rec, meta)}
                            disabled={isSubmitting}
                            data-testid="render-video"
                          >
                            {isSubmitting ? (
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Film className="mr-2 h-3.5 w-3.5" />
                            )}
                            Render video
                          </Button>
                        </>
                      );
                    })()}
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/assets">
                        <Download className="mr-2 h-3.5 w-3.5" />
                        View asset
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Distribution modal — same shape as /assets */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule distribution</DialogTitle>
            <DialogDescription>
              Plan when and where "{selected?.title}" goes out. Nothing is posted automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                <SelectTrigger id="channel">
                  <SelectValue placeholder="Pick a channel" />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.channel && <p className="text-xs text-destructive">{errors.channel}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaignName">Campaign name</Label>
              <Input
                id="campaignName"
                maxLength={120}
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Faceless drop · April"
              />
              {errors.campaignName && <p className="text-xs text-destructive">{errors.campaignName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Scheduled at</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              {errors.scheduledAt && <p className="text-xs text-destructive">{errors.scheduledAt}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                rows={3}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Hooks, hashtags, links to assets, etc."
              />
              {errors.notes && <p className="text-xs text-destructive">{errors.notes}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Queueing…" : "Queue task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewAsset?.title ?? "Video preview"}</DialogTitle>
            <DialogDescription>
              {previewAsset
                ? `video_forge · ${new Date(previewAsset.updated_at).toLocaleString()}`
                : null}
            </DialogDescription>
          </DialogHeader>
          <AssetPreviewRenderer
            content={previewAsset?.content ?? null}
            engineKey="video_forge"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EngineLayout>
  );
};

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="inline text-[10px] uppercase tracking-wide text-muted-foreground/80">
        {label}:{" "}
      </dt>
      <dd className="inline text-foreground">{value}</dd>
    </div>
  );
}

export default GeneratedVideos;
