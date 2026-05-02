// Render Video Cancel — FacelessForge proxy (LIVE)
//
// Cancels an in-flight FacelessForge render job. Validates ownership,
// calls the upstream cancel endpoint, then updates render_status on the
// asset. Handles `already_terminal` by reflecting the upstream status.

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

function isUuid(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);
}

function normaliseStatus(raw: unknown): "queued" | "running" | "completed" | "failed" | "cancelled" {
  const s = String(raw ?? "").toLowerCase();
  if (s === "completed" || s === "complete" || s === "done" || s === "succeeded") return "completed";
  if (s === "failed" || s === "error" || s === "errored") return "failed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "running" || s === "processing" || s === "in_progress" || s === "started") return "running";
  return "queued";
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

  let body: { job_id?: string; asset_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(corsHeaders, 400, { error: "Invalid JSON", code: "INVALID_JSON" });
  }

  const jobId = String(body.job_id ?? "");
  const assetId = String(body.asset_id ?? "");
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

  const cancelUrl = facelessForgeUrl(baseUrl, "/api/external/render-video/cancel");
  if (!cancelUrl) {
    return facelessForgeInvalidBaseUrlResponse(corsHeaders);
  }

  let upstreamStatus: "queued" | "running" | "completed" | "failed" | "cancelled" = "cancelled";
  let alreadyTerminal = false;
  let videoUrl: string | null = null;
  try {
    let upstream: Response;
    try {
      upstream = await fetchFacelessForgeUpstream(cancelUrl, {
        method: "POST",
        headers: {
          "X-FacelessForge-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ job_id: jobId }),
      });
    } catch (e) {
      const snippet = safeSnippet(e instanceof Error ? e.message : String(e), 160);
      console.error("[render-video-cancel] fetch error", cancelUrl, snippet);
      if (isAbortError(e)) {
        return jsonResponse(corsHeaders, 502, {
          error: "FacelessForge cancel request timed out.",
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
      console.error("[render-video-cancel] upstream error", upstream.status, lastSnippet);
      return jsonResponse(corsHeaders, 502, {
        error: "FacelessForge rejected the cancel request.",
        code: "FACELESSFORGE_UPSTREAM_ERROR",
        details: { upstream_http_status: upstream.status, last_snippet: lastSnippet },
      });
    }

    let data: Record<string, unknown> = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.error("[render-video-cancel] non-JSON body", safeSnippet(text, 400));
      return jsonResponse(corsHeaders, 502, {
        error: "FacelessForge returned a non-JSON response.",
        code: "FACELESSFORGE_INVALID_RESPONSE",
      });
    }
    alreadyTerminal = data.already_terminal === true;
    upstreamStatus = normaliseStatus(data.status ?? data.render_status ?? "cancelled");
    videoUrl = typeof data.video_url === "string"
      ? data.video_url
      : typeof data.rendered_video_url === "string"
      ? data.rendered_video_url
      : null;
  } catch (e) {
    console.error("[render-video-cancel] unexpected", e);
    return jsonResponse(corsHeaders, 502, {
      error: "Unexpected error while contacting FacelessForge.",
      code: "FACELESSFORGE_UNEXPECTED",
    });
  }

  // Persist final state. If upstream says already_terminal, reflect upstream status.
  const updates: Record<string, unknown> = { render_status: upstreamStatus };
  if (upstreamStatus === "completed" && videoUrl) {
    updates.rendered_video_url = videoUrl;
  }
  await supabase.from("assets").update(updates).eq("id", assetId);

  return new Response(
    JSON.stringify({
      job_id: jobId,
      status: upstreamStatus,
      already_terminal: alreadyTerminal,
      rendered_video_url: videoUrl,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
