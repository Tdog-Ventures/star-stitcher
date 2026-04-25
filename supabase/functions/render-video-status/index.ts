// Render Video Status — FacelessForge proxy (LIVE)
//
// GET status from FacelessForge. On `completed` we persist the returned
// video_url onto the asset; on `failed` we mark render_status = "failed".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
  } else {
    const url = new URL(req.url);
    jobId = url.searchParams.get("job_id") ?? "";
    assetId = url.searchParams.get("asset_id") ?? "";
  }

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

  try {
    const upstream = await fetch(
      `${baseUrl.replace(/\/$/, "")}/api/external/render-video-status?job_id=${encodeURIComponent(jobId)}`,
      { headers: { "X-FacelessForge-Key": apiKey } },
    );
    const text = await upstream.text();
    if (!upstream.ok) {
      console.error("[render-video-status] upstream error", upstream.status, text);
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
        error: errorMessage,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[render-video-status] fetch failed", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Upstream call failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
