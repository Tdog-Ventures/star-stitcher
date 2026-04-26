// Render Video Cancel — FacelessForge proxy (LIVE)
//
// Cancels an in-flight FacelessForge render job. Validates ownership,
// calls the upstream cancel endpoint, then updates render_status on the
// asset. Handles `already_terminal` by reflecting the upstream status.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

function facelessForgeUrl(rawBaseUrl: string, endpoint: string): string | null {
  const stripped = rawBaseUrl
    .trim()
    .replace(/^FACELESSFORGE_BASE_URL\s*=\s*/, "")
    .replace(/^['"]|['"]$/g, "")
    .trim();
  try {
    const url = new URL(stripped);
    let path = url.pathname.replace(/\/$/, "");
    for (const suffix of [
      "/api/external/render-video/cancel",
      "/api/external/render-video-status",
      "/api/external/render-video",
      "/api/external",
    ]) {
      if (path.endsWith(suffix)) {
        path = path.slice(0, -suffix.length);
        break;
      }
    }
    url.pathname = path || "/";
    url.search = "";
    url.hash = "";
    return `${url.toString().replace(/\/$/, "")}${endpoint}`;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  let body: { job_id?: string; asset_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const jobId = String(body.job_id ?? "");
  const assetId = String(body.asset_id ?? "");
  if (!jobId) {
    return new Response(JSON.stringify({ error: "job_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!isUuid(assetId)) {
    return new Response(JSON.stringify({ error: "asset_id must be a uuid" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: asset, error: assetErr } = await supabase
    .from("assets")
    .select("id, user_id, render_job_id, rendered_video_url, render_status")
    .eq("id", assetId)
    .maybeSingle();

  if (assetErr || !asset || asset.user_id !== userId) {
    return new Response(JSON.stringify({ error: "Asset not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (asset.render_job_id !== jobId) {
    return new Response(JSON.stringify({ error: "job_id does not match asset" }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("FACELESSFORGE_API_KEY") ?? "";
  const baseUrl = Deno.env.get("FACELESSFORGE_BASE_URL") ?? "";
  if (!apiKey || !baseUrl) {
    return new Response(
      JSON.stringify({ error: "FacelessForge is not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const cancelUrl = facelessForgeUrl(baseUrl, "/api/external/render-video/cancel");
  if (!cancelUrl) {
    return new Response(
      JSON.stringify({ error: "FacelessForge base URL is invalid" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let upstreamStatus: "queued" | "running" | "completed" | "failed" | "cancelled" = "cancelled";
  let alreadyTerminal = false;
  let videoUrl: string | null = null;
  try {
    const upstream = await fetch(
      cancelUrl,
      {
        method: "POST",
        headers: {
          "X-FacelessForge-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ job_id: jobId }),
      },
    );
    const text = await upstream.text();
    if (!upstream.ok) {
      console.error("[render-video-cancel] upstream error", upstream.status, text);
      return new Response(
        JSON.stringify({ error: `FacelessForge error [${upstream.status}]: ${text}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    let data: Record<string, unknown> = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return new Response(
        JSON.stringify({ error: "FacelessForge returned non-JSON response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    alreadyTerminal = data.already_terminal === true;
    upstreamStatus = normaliseStatus(data.status ?? data.render_status ?? "cancelled");
    videoUrl = typeof data.video_url === "string"
      ? data.video_url
      : typeof data.rendered_video_url === "string"
      ? data.rendered_video_url
      : null;
  } catch (e) {
    console.error("[render-video-cancel] fetch failed", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Upstream call failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
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
