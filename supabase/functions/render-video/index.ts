// Render Video — FacelessForge proxy (LIVE)
//
// Receives a render request from the /videos page, validates the caller,
// confirms the asset belongs to them, then POSTs to FacelessForge.
// The API key is read from Deno.env and never exposed to the browser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  facelessForgeInvalidBaseUrlResponse,
  facelessForgeNotConfiguredResponse,
  facelessForgeUrl,
  fetchFacelessForgeUpstream,
  isAbortError,
  jsonResponse,
  readFacelessForgeCredentials,
  safeSnippet,
} from "../_shared/facelessforge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SceneIn {
  scene_number?: number;
  duration?: number;
  duration_seconds?: number;
  narration_text?: string;
  visual_direction?: string;
  caption_text?: string;
  search_terms?: unknown;
}

interface RenderInput {
  asset_id: string;
  title: string;
  script: string;
  scene_breakdown: SceneIn[];
  stock_footage_terms: unknown[];
  captions: { short_caption?: string; long_caption?: string };
  voiceover_notes: unknown;
  engine: "videoforge" | "lumina" | "neon";
}

function isUuid(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);
}

const ALLOWED_ENGINES = new Set(["videoforge", "lumina", "neon"]);

function validate(body: unknown): { ok: true; data: RenderInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body must be an object" };
  const b = body as Record<string, unknown>;
  if (!isUuid(b.asset_id)) return { ok: false, error: "asset_id must be a uuid" };
  if (typeof b.title !== "string" || !b.title.trim()) return { ok: false, error: "title required" };
  if (typeof b.script !== "string" || !b.script.trim()) return { ok: false, error: "script required" };
  if (!Array.isArray(b.scene_breakdown)) return { ok: false, error: "scene_breakdown must be an array" };
  if (!Array.isArray(b.stock_footage_terms)) return { ok: false, error: "stock_footage_terms must be an array" };
  const caps = (b.captions ?? {}) as Record<string, unknown>;
  const engineRaw = typeof b.engine === "string" ? b.engine : "videoforge";
  const engine = (ALLOWED_ENGINES.has(engineRaw) ? engineRaw : "videoforge") as RenderInput["engine"];
  return {
    ok: true,
    data: {
      asset_id: b.asset_id as string,
      title: b.title as string,
      script: b.script as string,
      scene_breakdown: b.scene_breakdown as SceneIn[],
      stock_footage_terms: b.stock_footage_terms as unknown[],
      captions: {
        short_caption: typeof caps.short_caption === "string" ? caps.short_caption : undefined,
        long_caption: typeof caps.long_caption === "string" ? caps.long_caption : undefined,
      },
      voiceover_notes: b.voiceover_notes ?? null,
      engine,
    },
  };
}

// Map a VideoForge scene into the shape FacelessForge expects.
function mapScene(s: SceneIn, idx: number) {
  const dur = typeof s.duration === "number"
    ? s.duration
    : typeof s.duration_seconds === "number"
    ? s.duration_seconds
    : undefined;
  return {
    scene_number: typeof s.scene_number === "number" ? s.scene_number : idx + 1,
    duration: dur,
    duration_seconds: dur,
    narration_text: typeof s.narration_text === "string" ? s.narration_text : "",
    visual_direction: typeof s.visual_direction === "string" ? s.visual_direction : "",
    caption_text: typeof s.caption_text === "string" ? s.caption_text : "",
    search_terms: Array.isArray(s.search_terms) ? s.search_terms : [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse(corsHeaders, 405, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse(corsHeaders, 401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return jsonResponse(corsHeaders, 401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }
  const userId = userData.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(corsHeaders, 400, { error: "Invalid JSON", code: "INVALID_JSON" });
  }

  const parsed = validate(body);
  if (!parsed.ok) {
    return jsonResponse(corsHeaders, 400, { error: parsed.error, code: "VALIDATION_ERROR" });
  }
  const input = parsed.data;

  const { data: asset, error: assetErr } = await supabase
    .from("assets")
    .select("id, user_id, engine_key")
    .eq("id", input.asset_id)
    .maybeSingle();

  if (assetErr || !asset || asset.user_id !== userId) {
    return jsonResponse(corsHeaders, 404, { error: "Asset not found", code: "ASSET_NOT_FOUND" });
  }

  const creds = readFacelessForgeCredentials();
  if (!creds.ok) {
    return facelessForgeNotConfiguredResponse(corsHeaders, creds.missing);
  }
  const { apiKey, baseUrl } = creds;

  const candidatePaths = [
    "/render",
    "/api/render-video",
    "/v1/render",
    "/api/external/render-video",
  ];
  const candidateUrls = candidatePaths
    .map((p) => facelessForgeUrl(baseUrl, p))
    .filter((u): u is string => !!u);
  if (candidateUrls.length === 0) {
    return facelessForgeInvalidBaseUrlResponse(corsHeaders);
  }

  const upstreamPayload = {
    source: "ethinx_videoforge",
    external_asset_id: input.asset_id,
    title: input.title,
    script: input.script,
    scene_breakdown: input.scene_breakdown.map(mapScene),
    stock_footage_terms: input.stock_footage_terms,
    captions: input.captions,
    voiceover_notes: input.voiceover_notes,
    engine: input.engine,
  };

  let jobId = "";
  let upstreamStatus = "queued";
  let upstream: Response | null = null;
  let lastText = "";
  let usedUrl = "";
  const tried: { url: string; http_status: number }[] = [];

  try {
    for (const url of candidateUrls) {
      let resp: Response;
      try {
        resp = await fetchFacelessForgeUpstream(url, {
          method: "POST",
          headers: {
            "X-FacelessForge-Key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(upstreamPayload),
        });
      } catch (e) {
        const snippet = safeSnippet(e instanceof Error ? e.message : String(e), 160);
        console.error("[render-video] fetch error for", url, snippet);
        if (isAbortError(e)) {
          return jsonResponse(corsHeaders, 502, {
            error: "FacelessForge request timed out.",
            code: "FACELESSFORGE_TIMEOUT",
            details: { url_tried: url },
          });
        }
        return jsonResponse(corsHeaders, 502, {
          error: "Could not reach FacelessForge.",
          code: "FACELESSFORGE_NETWORK_ERROR",
          details: { url_tried: url, last_snippet: snippet },
        });
      }

      const text = await resp.text();
      const snippet = safeSnippet(text, 400);
      tried.push({ url, http_status: resp.status });
      console.error("[render-video] upstream", url, "->", resp.status, snippet.slice(0, 320));

      if (resp.status !== 404) {
        upstream = resp;
        lastText = text;
        usedUrl = url;
        break;
      }
      lastText = text;
      usedUrl = url;
    }

    if (!upstream) {
      const urlsTried = tried.map((t) => t.url).slice(0, 8);
      const lastSnippet = safeSnippet(lastText, 200);
      console.error("[render-video] all candidates 404", JSON.stringify({ urls_tried: urlsTried, lastSnippet }));
      return jsonResponse(corsHeaders, 502, {
        error:
          "No FacelessForge render endpoint accepted this request (only 404 responses). Check FACELESSFORGE_BASE_URL.",
        code: "FACELESSFORGE_ALL_CANDIDATES_404",
        details: {
          urls_tried: urlsTried,
          last_http_status: 404,
          last_snippet: lastSnippet,
        },
      });
    }

    if (!upstream.ok) {
      const lastSnippet = safeSnippet(lastText, 280);
      console.error("[render-video] upstream error", usedUrl, upstream.status, lastSnippet);
      return jsonResponse(corsHeaders, 502, {
        error: "FacelessForge rejected the render request.",
        code: "FACELESSFORGE_UPSTREAM_ERROR",
        details: {
          upstream_http_status: upstream.status,
          upstream_url: usedUrl,
          last_snippet: lastSnippet,
        },
      });
    }

    let data: Record<string, unknown> = {};
    try {
      data = lastText ? JSON.parse(lastText) : {};
    } catch {
      console.error("[render-video] non-JSON upstream body", safeSnippet(lastText, 400));
      return jsonResponse(corsHeaders, 502, {
        error: "FacelessForge returned a non-JSON response.",
        code: "FACELESSFORGE_INVALID_RESPONSE",
      });
    }
    jobId = String(
      data.render_job_id ?? data.job_id ?? data.id ?? "",
    );
    upstreamStatus = String(data.status ?? data.render_status ?? "queued");
    if (!jobId) {
      console.error("[render-video] no job id in upstream response", safeSnippet(JSON.stringify(data), 400));
      return jsonResponse(corsHeaders, 502, {
        error: "FacelessForge did not return a job id.",
        code: "FACELESSFORGE_NO_JOB_ID",
      });
    }
  } catch (e) {
    console.error("[render-video] unexpected", e);
    return jsonResponse(corsHeaders, 502, {
      error: "Unexpected error while contacting FacelessForge.",
      code: "FACELESSFORGE_UNEXPECTED",
    });
  }

  const { error: updateErr } = await supabase
    .from("assets")
    .update({ render_job_id: jobId, render_status: "queued", render_engine: input.engine })
    .eq("id", input.asset_id);

  if (updateErr) {
    console.error("[render-video] failed to persist job_id", updateErr);
    return jsonResponse(corsHeaders, 500, { error: updateErr.message, code: "DB_UPDATE_FAILED" });
  }

  return new Response(
    JSON.stringify({
      job_id: jobId,
      render_job_id: jobId,
      status: "queued",
      upstream_status: upstreamStatus,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
