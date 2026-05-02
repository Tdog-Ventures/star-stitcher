// Render Video Status — FacelessForge proxy (LIVE)
//
// GET status from FacelessForge. On `completed` we persist the returned
// video_url onto the asset; on `failed` we mark render_status = "failed".

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
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function isUuid(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);
}

// Normalise upstream status to one of: queued | running | completed | failed.
function normaliseStatus(raw: unknown): "queued" | "running" | "completed" | "failed" {
  const s = String(raw ?? "").toLowerCase();
  if (s === "completed" || s === "complete" || s === "done" || s === "succeeded") return "completed";
  if (s === "failed" || s === "error" || s === "errored") return "failed";
  if (s === "running" || s === "processing" || s === "in_progress" || s === "started") return "running";
  return "queued";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

  // Accept params from query string (GET) OR body (POST via supabase.functions.invoke).
  let jobId = "";
  let assetId = "";
  if (req.method === "POST") {
    try {
      const body = await req.json();
      jobId = String(body.job_id ?? "");
      assetId = String(body.asset_id ?? "");
    } catch {
      /* ignore */
    }
  } else if (req.method === "GET") {
    const url = new URL(req.url);
    jobId = url.searchParams.get("job_id") ?? "";
    assetId = url.searchParams.get("asset_id") ?? "";
  } else {
    return jsonResponse(corsHeaders, 405, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  }

  if (!jobId) {
    return jsonResponse(corsHeaders, 400, { error: "job_id required", code: "VALIDATION_ERROR" });
  }
  if (!isUuid(assetId)) {
    return jsonResponse(corsHeaders, 400, { error: "asset_id must be a uuid", code: "VALIDATION_ERROR" });
  }

  const { data: asset, error: assetErr } = await supabase
    .from("assets")
    .select("id, user_id, render_job_id, rendered_video_url, render_status")
    .eq("id", assetId)
    .maybeSingle();

  if (assetErr || !asset || asset.user_id !== userId) {
    return jsonResponse(corsHeaders, 404, { error: "Asset not found", code: "ASSET_NOT_FOUND" });
  }
  if (asset.render_job_id !== jobId) {
    return jsonResponse(corsHeaders, 409, { error: "job_id does not match asset", code: "JOB_MISMATCH" });
  }

  const creds = readFacelessForgeCredentials();
  if (!creds.ok) {
    return facelessForgeNotConfiguredResponse(corsHeaders, creds.missing);
  }
  const { apiKey, baseUrl } = creds;

  const statusUrl = facelessForgeUrl(baseUrl, "/api/external/render-video-status");
  if (!statusUrl) {
    return facelessForgeInvalidBaseUrlResponse(corsHeaders);
  }

  const upstreamFullUrl = `${statusUrl}?job_id=${encodeURIComponent(jobId)}`;

  try {
    let upstream: Response;
    try {
      upstream = await fetchFacelessForgeUpstream(upstreamFullUrl, {
        headers: { "X-FacelessForge-Key": apiKey },
      });
    } catch (e) {
      const snippet = safeSnippet(e instanceof Error ? e.message : String(e), 160);
      console.error("[render-video-status] fetch error", upstreamFullUrl, snippet);
      if (isAbortError(e)) {
        return jsonResponse(corsHeaders, 502, {
          error: "FacelessForge status request timed out.",
          code: "FACELESSFORGE_TIMEOUT",
        });
      }
      return jsonResponse(corsHeaders, 502, {
        error: "Could not reach FacelessForge.",
        code: "FACELESSFORGE_NETWORK_ERROR",
        details: { last_snippet: snippet },
      });
    }

    const text = await upstream.text();
    if (!upstream.ok) {
      const lastSnippet = safeSnippet(text, 280);
      console.error("[render-video-status] upstream error", upstream.status, lastSnippet);
      return jsonResponse(corsHeaders, 502, {
        error: "FacelessForge rejected the status request.",
        code: "FACELESSFORGE_UPSTREAM_ERROR",
        details: { upstream_http_status: upstream.status, last_snippet: lastSnippet },
      });
    }

    let data: Record<string, unknown> = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.error("[render-video-status] non-JSON body", safeSnippet(text, 400));
      return jsonResponse(corsHeaders, 502, {
        error: "FacelessForge returned a non-JSON response.",
        code: "FACELESSFORGE_INVALID_RESPONSE",
      });
    }

    const status = normaliseStatus(data.status ?? data.render_status);
    const videoUrl = typeof data.video_url === "string"
      ? data.video_url
      : typeof data.rendered_video_url === "string"
      ? data.rendered_video_url
      : null;
    const errorMessage = typeof data.error === "string"
      ? data.error
      : typeof data.message === "string"
      ? data.message
      : null;

    // Normalise progress to a 0-100 integer when upstream provides it.
    // FacelessForge may return `progress` (0-1 or 0-100) or `percent`.
    let progress: number | null = null;
    const rawProgress = (data.progress ?? data.percent ?? data.progress_percent) as unknown;
    if (typeof rawProgress === "number" && Number.isFinite(rawProgress)) {
      const v = rawProgress <= 1 ? rawProgress * 100 : rawProgress;
      progress = Math.max(0, Math.min(100, Math.round(v)));
    }
    if (status === "completed") progress = 100;
    if (status === "queued" && progress === null) progress = 0;

    if (status === "completed" && videoUrl) {
      await supabase
        .from("assets")
        .update({ rendered_video_url: videoUrl, render_status: "completed" })
        .eq("id", assetId);
    } else if (status === "failed") {
      await supabase
        .from("assets")
        .update({ render_status: "failed" })
        .eq("id", assetId);
    } else if (status === "running" && asset.render_status !== "running") {
      await supabase
        .from("assets")
        .update({ render_status: "running" })
        .eq("id", assetId);
    }

    return new Response(
      JSON.stringify({
        job_id: jobId,
        status,
        video_url: videoUrl,
        rendered_video_url: videoUrl,
        progress,
        error: errorMessage,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[render-video-status] unexpected", e);
    return jsonResponse(corsHeaders, 502, {
      error: "Unexpected error while contacting FacelessForge.",
      code: "FACELESSFORGE_UNEXPECTED",
    });
  }
});
