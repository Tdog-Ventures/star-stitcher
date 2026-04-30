import { useCallback, useRef, useState } from "react";
import { Loader2, Download, Sparkles, RotateCcw, Bug, Copy, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

interface Scene {
  text: string;
  keyword: string;
  duration: number; // seconds
  caption: string;
}

interface Props {
  /** Full narration script. */
  script: string;
  /** Optional pre-built scenes (from Video Forge). If absent, we split the script. */
  scenes?: Scene[];
  aspect: "9:16" | "16:9";
  /** Title used when saving the asset row. */
  title?: string;
  /** Called once the video is uploaded + asset row written. */
  onComplete?: (videoUrl: string, assetId: string) => void;
}

type RenderStatus = "idle" | "preparing" | "rendering" | "uploading" | "done" | "failed";

const FALLBACK_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

/**
 * 100% open-source, browser-native video renderer.
 *
 * Pipeline:
 *  1. Take scenes (provided or auto-split from script).
 *  2. For each scene: fetch a stock clip via the `pexels-search` edge function.
 *  3. Composite onto a <canvas> with Ken Burns zoom + caption overlay.
 *  4. captureStream() → MediaRecorder → .webm Blob.
 *  5. Speak narration via Web Speech API in parallel.
 *  6. Upload .webm to Supabase Storage (`videos` bucket) and insert an asset row
 *     so the result appears in /videos with render_engine = 'browser-open'.
 */
export default function OpenSourceVideoRenderer({
  script,
  scenes: providedScenes,
  aspect,
  title,
  onComplete,
}: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState<RenderStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const cancelRef = useRef(false);

  // ---- Debug overlay state -------------------------------------------------
  type LogLevel = "info" | "warn" | "error" | "success";
  interface DebugLog {
    t: number; // ms since render start
    level: LogLevel;
    tag: string;
    msg: string;
  }
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [showDebug, setShowDebug] = useState(true);
  const renderStartRef = useRef<number>(0);

  const log = useCallback((level: LogLevel, tag: string, msg: string) => {
    const entry: DebugLog = {
      t: renderStartRef.current ? performance.now() - renderStartRef.current : 0,
      level,
      tag,
      msg,
    };
    // Mirror to console for full stack traces.
    const prefix = `[video-forge:${tag}]`;
    if (level === "error") console.error(prefix, msg);
    else if (level === "warn") console.warn(prefix, msg);
    else console.log(prefix, msg);
    setDebugLogs((prev) => [...prev, entry]);
  }, []);

  const clearLogs = () => setDebugLogs([]);
  const copyLogs = async () => {
    const text = debugLogs
      .map((l) => `[${(l.t / 1000).toFixed(2)}s] ${l.level.toUpperCase()} ${l.tag}: ${l.msg}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Debug logs copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const isPortrait = aspect === "9:16";
  const width = isPortrait ? 1080 : 1920;
  const height = isPortrait ? 1920 : 1080;

  /**
   * Extract a small unified set of visual keywords from the FULL script so
   * every scene pulls cohesive footage of the same subject (instead of each
   * scene fetching a tiny chunk that produces disjointed clips).
   *
   * Strategy: strip stop-words, keep the most frequent meaningful tokens,
   * pair them into 2-word phrases. Returns 3-6 phrases that we rotate
   * through across scenes.
   */
  const buildUnifiedKeywords = (fullScript: string): string[] => {
    const stop = new Set([
      "the","a","an","and","or","but","of","to","in","on","for","with","at","by",
      "from","as","is","are","was","were","be","been","being","it","its","this",
      "that","these","those","i","you","he","she","we","they","them","our","your",
      "their","my","me","us","what","which","who","when","where","why","how",
      "can","will","would","should","could","may","might","must","do","does","did",
      "have","has","had","not","no","so","if","then","than","just","very","more",
      "most","some","any","all","each","every","into","over","under","about",
      "create","make","video","second","seconds","cinematic","powerful","smooth",
    ]);
    const tokens = fullScript
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stop.has(w));

    if (tokens.length === 0) return ["cinematic abstract motion"];

    // Frequency-rank meaningful tokens, preserving first-seen order on ties.
    const freq = new Map<string, { n: number; idx: number }>();
    tokens.forEach((t, i) => {
      const cur = freq.get(t);
      if (cur) cur.n += 1;
      else freq.set(t, { n: 1, idx: i });
    });
    const ranked = [...freq.entries()]
      .sort((a, b) => b[1].n - a[1].n || a[1].idx - b[1].idx)
      .map(([w]) => w);

    const top = ranked.slice(0, 6);
    if (top.length === 0) return ["cinematic abstract motion"];
    if (top.length === 1) return [top[0], `${top[0]} closeup`, `${top[0]} motion`];

    // Build cohesive 2-word phrases anchored on the strongest token.
    const anchor = top[0];
    const phrases = new Set<string>();
    phrases.add(`${anchor} ${top[1]}`);
    for (let i = 1; i < top.length; i++) {
      phrases.add(`${anchor} ${top[i]}`);
    }
    // Add a couple of pair-of-secondary phrases for variety without losing theme.
    if (top[1] && top[2]) phrases.add(`${top[1]} ${top[2]}`);
    if (top[1] && top[3]) phrases.add(`${top[1]} ${top[3]}`);

    return [...phrases].slice(0, 6);
  };

  const buildFallbackScenes = (): Scene[] => {
    const words = script.trim().split(/\s+/);
    if (!words.length || (words.length === 1 && !words[0])) {
      return [
        {
          text: "Your story, visualized.",
          keyword: "cinematic abstract motion",
          duration: 6,
          caption: "Your story",
        },
      ];
    }
    const unified = buildUnifiedKeywords(script);
    const chunkSize = Math.max(8, Math.ceil(words.length / 3));
    const out: Scene[] = [];
    let k = 0;
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(" ");
      out.push({
        text: chunk,
        keyword: unified[k % unified.length],
        duration: 6,
        caption: chunk.length > 60 ? chunk.slice(0, 57) + "…" : chunk,
      });
      k += 1;
    }
    return out;
  };

  const fetchStockClip = async (
    keyword: string,
    sceneIdx: number,
  ): Promise<HTMLVideoElement> => {
    const tag = `scene-${sceneIdx + 1}`;
    let stockUrl = "";
    const fetchStart = performance.now();
    log("info", tag, `Pexels search → "${keyword}"`);
    try {
      const { data, error } = await supabase.functions.invoke("pexels-search", {
        body: { keyword, orientation: isPortrait ? "portrait" : "landscape" },
      });
      if (error) {
        log("warn", tag, `pexels-search edge error: ${error.message}`);
      }
      stockUrl = (data as { url?: string } | null)?.url ?? "";
      const ms = Math.round(performance.now() - fetchStart);
      if (stockUrl) {
        log("success", tag, `Pexels hit (${ms}ms): ${stockUrl.slice(0, 70)}…`);
      } else {
        log("warn", tag, `Pexels returned no url (${ms}ms) — will use fallback`);
      }
    } catch (e) {
      log("warn", tag, `Pexels lookup threw: ${(e as Error).message}`);
    }

    const videoEl = document.createElement("video");
    videoEl.crossOrigin = "anonymous";
    videoEl.muted = true;
    videoEl.loop = true;
    videoEl.playsInline = true;
    const initialSrc = stockUrl || FALLBACK_VIDEO;
    if (!stockUrl) log("warn", tag, "Using fallback BigBuckBunny clip");
    videoEl.src = initialSrc;

    const loadStart = performance.now();
    await new Promise<void>((resolve) => {
      const onReady = () => {
        videoEl.removeEventListener("loadeddata", onReady);
        videoEl.removeEventListener("error", onError);
        const ms = Math.round(performance.now() - loadStart);
        log(
          "success",
          tag,
          `Clip loaded (${ms}ms) ${videoEl.videoWidth}×${videoEl.videoHeight}`,
        );
        resolve();
      };
      const onError = () => {
        videoEl.removeEventListener("loadeddata", onReady);
        videoEl.removeEventListener("error", onError);
        log("error", tag, `Clip failed to load: ${videoEl.src.slice(0, 60)}…`);
        if (videoEl.src !== FALLBACK_VIDEO) {
          log("info", tag, "Retrying with fallback clip");
          videoEl.src = FALLBACK_VIDEO;
          videoEl.addEventListener("loadeddata", onReady, { once: true });
          videoEl.addEventListener("error", () => {
            log("error", tag, "Fallback clip also failed");
            resolve();
          }, { once: true });
        } else {
          resolve();
        }
      };
      videoEl.addEventListener("loadeddata", onReady, { once: true });
      videoEl.addEventListener("error", onError, { once: true });
    });

    try {
      await videoEl.play();
    } catch (e) {
      log("warn", tag, `videoEl.play() rejected: ${(e as Error).message}`);
    }
    return videoEl;
  };

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    videoEl: HTMLVideoElement,
    caption: string,
    t: number, // 0..1 progress through scene
  ) => {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;

    // Black background under everything.
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);

    // Cover-fit the video into the canvas.
    const vw = videoEl.videoWidth || cw;
    const vh = videoEl.videoHeight || ch;
    const scale = Math.max(cw / vw, ch / vh);
    const baseDrawW = vw * scale;
    const baseDrawH = vh * scale;

    // Ken Burns: gentle zoom 1 → 1.18 across the scene.
    const zoom = 1 + t * 0.18;
    const drawW = baseDrawW * zoom;
    const drawH = baseDrawH * zoom;
    const dx = (cw - drawW) / 2;
    const dy = (ch - drawH) / 2;

    ctx.drawImage(videoEl, dx, dy, drawW, drawH);

    // Subtle bottom gradient for caption legibility.
    const gradH = Math.round(ch * 0.32);
    const grad = ctx.createLinearGradient(0, ch - gradH, 0, ch);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, ch - gradH, cw, gradH);

    // Caption.
    if (caption) {
      const fontSize = isPortrait ? 56 : 44;
      ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ffffff";

      // Word-wrap caption.
      const maxW = cw * 0.86;
      const words = caption.split(/\s+/);
      const lines: string[] = [];
      let line = "";
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxW && line) {
          lines.push(line);
          line = w;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);

      const lineH = fontSize * 1.18;
      const totalH = lines.length * lineH;
      const startY = ch - totalH / 2 - fontSize * 0.9;
      lines.forEach((l, i) => {
        ctx.fillText(l, cw / 2, startY + i * lineH);
      });
      ctx.shadowBlur = 0;
    }
  };

  const renderVideo = async () => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    if (!script.trim() && (!providedScenes || providedScenes.length === 0)) {
      toast.error("Add a script first");
      return;
    }

    cancelRef.current = false;
    setStatus("preparing");
    setProgress(2);
    setErrorMsg(null);
    setVideoUrl(null);
    setDebugLogs([]);
    renderStartRef.current = performance.now();
    log("info", "init", `Aspect ${aspect} · canvas ${width}×${height}`);
    log("info", "init", `User: ${user.id.slice(0, 8)}…`);

    // Always derive a unified keyword set from the full script and rotate it
    // across scenes — overrides any per-scene keywords from the parent so the
    // resulting clips share a single visual subject.
    const unifiedKeywords = buildUnifiedKeywords(script || (providedScenes ?? []).map((s) => s.text).join(" "));
    log("info", "keywords", `Unified set [${unifiedKeywords.length}]: ${unifiedKeywords.join(" | ")}`);
    const baseScenes =
      providedScenes && providedScenes.length > 0
        ? providedScenes
        : buildFallbackScenes();
    const scenes: Scene[] = baseScenes.map((s, i) => ({
      ...s,
      keyword: unifiedKeywords[i % unifiedKeywords.length],
    }));
    const targetDuration = scenes.reduce((acc, s) => acc + s.duration, 0);
    log(
      "info",
      "scenes",
      `${scenes.length} scenes · target duration ${targetDuration.toFixed(1)}s`,
    );

    // Cancel any in-flight TTS.
    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.cancel();
      log(
        "info",
        "tts",
        `speechSynthesis available · ${speechSynthesis.getVoices().length} voices`,
      );
    } else {
      log("warn", "tts", "speechSynthesis API not available in this browser");
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      setStatus("failed");
      setErrorMsg("Canvas not supported in this browser");
      log("error", "canvas", "getContext('2d') returned null");
      return;
    }

    // Paint one frame so captureStream produces frames immediately.
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const stream = canvas.captureStream(30);

    // Pick the best supported mime type. Safari has no webm/vp9; the loop
    // tries vp9 → vp8 → default.
    const mimeCandidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    const mimeType = mimeCandidates.find((m) =>
      typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m),
    );
    if (!mimeType) {
      setStatus("failed");
      setErrorMsg("Your browser doesn't support MediaRecorder webm output. Try Chrome.");
      log("error", "recorder", "No supported webm MIME type found");
      return;
    }
    log("info", "recorder", `MIME: ${mimeType}`);

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = (e) => {
      log("error", "recorder", `MediaRecorder error: ${(e as ErrorEvent).message ?? "unknown"}`);
    };

    setStatus("rendering");
    setProgress(8);
    recorder.start(250);
    log("info", "recorder", "Recording started (timeslice 250ms)");

    // Animation loop driven by rAF; we switch the active video as scenes change.
    let activeVideo: HTMLVideoElement | null = null;
    let sceneStart = performance.now();
    let currentScene: Scene | null = null;

    const drawLoop = () => {
      if (cancelRef.current) return;
      if (!activeVideo || !currentScene) {
        requestAnimationFrame(drawLoop);
        return;
      }
      const t = Math.min(
        (performance.now() - sceneStart) / (currentScene.duration * 1000),
        1,
      );
      drawScene(ctx, activeVideo, currentScene.caption, t);
      requestAnimationFrame(drawLoop);
    };
    requestAnimationFrame(drawLoop);

    try {
      for (let i = 0; i < scenes.length; i++) {
        if (cancelRef.current) {
          log("warn", "loop", `Cancelled before scene ${i + 1}`);
          break;
        }
        const scene = scenes[i];
        log(
          "info",
          `scene-${i + 1}`,
          `Start (${scene.duration}s) caption="${scene.caption.slice(0, 40)}"`,
        );

        const videoEl = await fetchStockClip(scene.keyword, i);
        // Detach previous video element from playback.
        if (activeVideo && activeVideo !== videoEl) {
          try {
            activeVideo.pause();
            activeVideo.src = "";
            activeVideo.load();
          } catch {
            /* ignore */
          }
        }
        activeVideo = videoEl;
        currentScene = scene;
        sceneStart = performance.now();

        // Speak narration for this scene (parallel to the video frames).
        if (typeof speechSynthesis !== "undefined" && scene.text) {
          const u = new SpeechSynthesisUtterance(scene.text);
          u.rate = 0.95;
          u.pitch = 1.0;
          u.volume = 1.0;
          u.onstart = () => log("info", `tts-${i + 1}`, "TTS started");
          u.onend = () =>
            log("info", `tts-${i + 1}`, "TTS ended");
          u.onerror = (ev) =>
            log("error", `tts-${i + 1}`, `TTS error: ${ev.error ?? "unknown"}`);
          // Don't await — we time the scene by duration, not by TTS finishing.
          speechSynthesis.speak(u);
          log(
            "info",
            `tts-${i + 1}`,
            `Queued utterance (${scene.text.length} chars) — note: cannot be captured into .webm`,
          );
        }

        // Hold this scene for its duration.
        await new Promise<void>((resolve) =>
          setTimeout(resolve, scene.duration * 1000),
        );

        // Progress: 10% setup → 85% render → 100% upload.
        const sceneProgress = 10 + Math.round(((i + 1) / scenes.length) * 75);
        setProgress(sceneProgress);
        log("success", `scene-${i + 1}`, `Done · progress ${sceneProgress}%`);
      }
    } catch (e) {
      log("error", "loop", `Scene loop threw: ${(e as Error).message}`);
    }

    cancelRef.current = true; // stops drawLoop
    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.cancel();
    }

    const elapsedRender = (performance.now() - renderStartRef.current) / 1000;
    log("info", "recorder", `Stopping recorder · elapsed ${elapsedRender.toFixed(2)}s`);

    // Stop recorder and wait for the final blob.
    const blob: Blob = await new Promise((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: mimeType }));
      };
      // Some browsers need a tiny delay before stop() to flush the last chunk.
      setTimeout(() => {
        try {
          recorder.stop();
        } catch (e) {
          log("warn", "recorder", `recorder.stop() threw: ${(e as Error).message}`);
        }
      }, 200);
    });

    log(
      "info",
      "recorder",
      `Blob ready · ${(blob.size / 1024).toFixed(1)} KB · ${chunks.length} chunks`,
    );

    setStatus("uploading");
    setProgress(90);

    const localUrl = URL.createObjectURL(blob);
    setVideoUrl(localUrl);

    // Probe final duration off the local blob so we can flag mismatches early.
    try {
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.src = localUrl;
      await new Promise<void>((resolve) => {
        probe.addEventListener("loadedmetadata", () => resolve(), { once: true });
        probe.addEventListener("error", () => resolve(), { once: true });
        setTimeout(resolve, 1500);
      });
      const actual = isFinite(probe.duration) ? probe.duration : -1;
      const target = scenes.reduce((a, s) => a + s.duration, 0);
      if (actual < 0) {
        log("warn", "duration", "Could not read blob duration (Infinity/NaN — common with webm)");
      } else if (Math.abs(actual - target) > 1.0) {
        log("error", "duration", `MISMATCH actual ${actual.toFixed(2)}s vs target ${target}s`);
      } else {
        log("success", "duration", `actual ${actual.toFixed(2)}s ≈ target ${target}s`);
      }
    } catch (e) {
      log("warn", "duration", `Probe failed: ${(e as Error).message}`);
    }

    // Upload to Storage. File path is namespaced by user id so the per-user
    // RLS policy (`auth.uid()::text = (storage.foldername(name))[1]`) allows it.
    const jobId = `browser-${
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().slice(0, 8)
        : Date.now().toString(36)
    }`;
    const path = `${user.id}/${jobId}.webm`;
    log("info", "upload", `Uploading to videos/${path}`);

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(path, blob, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      log("error", "upload", uploadError.message);
      setStatus("failed");
      setErrorMsg(`Upload failed: ${uploadError.message}. Video is available locally below.`);
      toast.error("Upload failed — video saved locally only");
      return;
    }
    log("success", "upload", "Uploaded to Storage");

    const {
      data: { publicUrl },
    } = supabase.storage.from("videos").getPublicUrl(path);

    // Insert asset row so it shows up in /videos with the new chip.
    const safeTitle = (title || script.slice(0, 60) || "Browser-rendered video").trim();
    const { data: asset, error: insertError } = await supabase
      .from("assets")
      .insert({
        user_id: user.id,
        engine_key: "video_forge",
        title: safeTitle,
        status: "draft",
        render_engine: "browser-open",
        render_job_id: jobId,
        render_status: "completed",
        rendered_video_url: publicUrl,
      })
      .select()
      .single();

    setProgress(100);
    setStatus("done");

    if (insertError) {
      log("error", "asset", `assets insert failed: ${insertError.message}`);
      toast.error("Render saved to Storage, but Generated Videos row failed");
      return;
    }

    log("success", "asset", `assets row ${asset!.id} created`);
    toast.success("Video ready — saved to Generated Videos");
    onComplete?.(publicUrl, asset!.id);
  };

  const isWorking =
    status === "preparing" || status === "rendering" || status === "uploading";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          onClick={renderVideo}
          disabled={isWorking}
          className="min-w-[260px]"
        >
          {isWorking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {status === "preparing" && "Preparing scenes…"}
              {status === "rendering" && `Rendering ${progress}%`}
              {status === "uploading" && "Uploading…"}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              {status === "done" ? "Render again" : "Generate video (free)"}
            </>
          )}
        </Button>
        <Badge variant="outline" className="border-primary/40 text-primary">
          Browser Open · Free
        </Badge>
        <span className="text-xs text-muted-foreground">
          {aspect} · stock footage from Pexels · voice via your browser
        </span>
      </div>

      {isWorking && (
        <div className="space-y-1">
          <Progress value={progress} className="h-3" />
          <p className="text-xs text-muted-foreground">
            Rendering happens in your browser. Keep this tab open.
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {videoUrl && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <video
            src={videoUrl}
            controls
            className="w-full rounded-lg bg-black"
            style={{ aspectRatio: isPortrait ? "9 / 16" : "16 / 9", maxHeight: 520 }}
          />
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href={videoUrl} download={`video-${Date.now()}.webm`}>
                <Download className="mr-2 h-4 w-4" />
                Download .webm
              </a>
            </Button>
            <Button size="sm" variant="outline" onClick={renderVideo} disabled={isWorking}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Render again
            </Button>
          </div>
        </div>
      )}

      {/* Debug overlay — always rendered so users can capture failures.
          Shows scene fetch, clip load, TTS, recorder, duration, upload events. */}
      <div className="rounded-xl border border-border bg-muted/30">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={() => setShowDebug((v) => !v)}
            className="flex items-center gap-2 text-xs font-medium text-foreground hover:text-primary"
          >
            <Bug className="h-3.5 w-3.5" />
            Debug log ({debugLogs.length})
            <span className="text-muted-foreground">{showDebug ? "▾" : "▸"}</span>
          </button>
          {showDebug && debugLogs.length > 0 && (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copyLogs}>
                <Copy className="mr-1 h-3 w-3" /> Copy
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={clearLogs}>
                <Trash2 className="mr-1 h-3 w-3" /> Clear
              </Button>
            </div>
          )}
        </div>
        {showDebug && (
          <ScrollArea className="h-56">
            <div className="space-y-0.5 px-3 py-2 font-mono text-[11px] leading-relaxed">
              {debugLogs.length === 0 && (
                <p className="text-muted-foreground">
                  No events yet. Hit Generate to start capturing scene fetch, clip load,
                  audio, recorder and duration events.
                </p>
              )}
              {debugLogs.map((l, i) => {
                const color =
                  l.level === "error"
                    ? "text-destructive"
                    : l.level === "warn"
                    ? "text-yellow-500"
                    : l.level === "success"
                    ? "text-emerald-500"
                    : "text-muted-foreground";
                return (
                  <div key={i} className="flex gap-2">
                    <span className="w-12 shrink-0 text-muted-foreground/70">
                      {(l.t / 1000).toFixed(2)}s
                    </span>
                    <span className={`w-16 shrink-0 ${color}`}>{l.level}</span>
                    <span className="w-20 shrink-0 text-foreground/80">{l.tag}</span>
                    <span className="text-foreground/90 break-all">{l.msg}</span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
