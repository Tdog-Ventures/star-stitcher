// Render Video Status — FacelessForge proxy (STUB MODE)
//
// In stub mode this returns { status: 'completed', video_url: null } on the
// first poll, but does NOT write a fake video_url onto the asset. The UI uses
// rendered_video_url to decide whether to show "Download MP4", so a null url
// keeps the UI honest: no MP4 is claimed to exist.
//
// In real mode this would proxy GET ${FACELESSFORGE_BASE_URL}/jobs/:id and,
// on completed, persist the returned video_url to assets.rendered_video_url.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const STUB_API_KEY = "stub-not-connected";

function isUuid(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);
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
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub as string;

  // Accept params from query string (GET) OR body (POST via supabase.functions.invoke)
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
  const isStub = !apiKey || apiKey === STUB_API_KEY || !baseUrl;

  if (isStub) {
    // Mark the asset's render_status as completed so resume-on-reload settles,
    // but DO NOT write a video_url. The UI must keep showing the stub banner
    // and never offer a Download MP4 button.
    if (asset.render_status !== "completed") {
      await supabase
        .from("assets")
        .update({ render_status: "completed" })
        .eq("id", assetId);
    }
    return new Response(
      JSON.stringify({
        job_id: jobId,
        status: "completed",
        video_url: null,
        stub: true,
        message:
          "Render integration stub — real FacelessForge API not connected yet. No MP4 was produced.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ---- Future real-mode branch ----
  try {
    const upstream = await fetch(
      `${baseUrl.replace(/\/$/, "")}/jobs/${encodeURIComponent(jobId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!upstream.ok) {
      const txt = await upstream.text();
      return new Response(
        JSON.stringify({ error: `FacelessForge error [${upstream.status}]: ${txt}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const data = await upstream.json();
    const status = String(data.status ?? "pending");
    const videoUrl = typeof data.video_url === "string" ? data.video_url : null;

    if (status === "completed" && videoUrl) {
      await supabase
        .from("assets")
        .update({ rendered_video_url: videoUrl, render_status: "completed" })
        .eq("id", assetId);
    } else if (status === "failed") {
      await supabase.from("assets").update({ render_status: "failed" }).eq("id", assetId);
    }

    return new Response(
      JSON.stringify({ job_id: jobId, status, video_url: videoUrl, stub: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Upstream call failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
