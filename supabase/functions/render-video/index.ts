// Render Video — FacelessForge proxy (LIVE)
//
// Receives a render request from the /videos page, validates the caller,
// confirms the asset belongs to them, then POSTs to FacelessForge.
// The API key is read from Deno.env and never exposed to the browser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
}

function isUuid(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);
}

function validate(body: unknown): { ok: true; data: RenderInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body must be an object" };
  const b = body as Record<string, unknown>;
  if (!isUuid(b.asset_id)) return { ok: false, error: "asset_id must be a uuid" };
  if (typeof b.title !== "string" || !b.title.trim()) return { ok: false, error: "title required" };
  if (typeof b.script !== "string") return { ok: false, error: "script required" };
  if (!Array.isArray(b.scene_breakdown)) return { ok: false, error: "scene_breakdown must be an array" };
  if (!Array.isArray(b.stock_footage_terms)) return { ok: false, error: "stock_footage_terms must be an array" };
  const caps = (b.captions ?? {}) as Record<string, unknown>;
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = validate(body);
  if (!parsed.ok) {
    return new Response(JSON.stringify({ error: parsed.error }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const input = parsed.data;

  const { data: asset, error: assetErr } = await supabase
    .from("assets")
    .select("id, user_id, engine_key")
    .eq("id", input.asset_id)
    .maybeSingle();

  if (assetErr || !asset || asset.user_id !== userId) {
    return new Response(JSON.stringify({ error: "Asset not found" }), {
      status: 404,
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

  const upstreamPayload = {
    source: "ethinx_videoforge",
    external_asset_id: input.asset_id,
    title: input.title,
    script: input.script,
    scene_breakdown: input.scene_breakdown.map(mapScene),
    stock_footage_terms: input.stock_footage_terms,
    captions: input.captions,
    voiceover_notes: input.voiceover_notes,
  };

  let jobId = "";
  let upstreamStatus = "queued";
  try {
    const upstream = await fetch(
      `${baseUrl.replace(/\/$/, "")}/api/external/render-video`,
      {
        method: "POST",
        headers: {
          "X-FacelessForge-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(upstreamPayload),
      },
    );
    const text = await upstream.text();
    if (!upstream.ok) {
      console.error("[render-video] upstream error", upstream.status, text);
      return new Response(
        JSON.stringify({ error: `FacelessForge error [${upstream.status}]: ${text}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    let data: Record<string, unknown> = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.error("[render-video] non-JSON upstream body", text);
      return new Response(
        JSON.stringify({ error: "FacelessForge returned non-JSON response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    jobId = String(
      data.render_job_id ?? data.job_id ?? data.id ?? "",
    );
    upstreamStatus = String(data.status ?? data.render_status ?? "queued");
    if (!jobId) {
      console.error("[render-video] no job id in upstream response", data);
      return new Response(
        JSON.stringify({ error: "FacelessForge did not return a job id" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (e) {
    console.error("[render-video] fetch failed", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Upstream call failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { error: updateErr } = await supabase
    .from("assets")
    .update({ render_job_id: jobId, render_status: "queued" })
    .eq("id", input.asset_id);

  if (updateErr) {
    console.error("[render-video] failed to persist job_id", updateErr);
    return new Response(JSON.stringify({ error: updateErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
