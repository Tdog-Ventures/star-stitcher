// Render Video — FacelessForge proxy (STUB MODE)
//
// This edge function is the future proxy boundary between the app and the
// FacelessForge render API. While in stub mode (no real FACELESSFORGE_API_KEY
// configured), it does NOT call out to FacelessForge — it just records a fake
// render_job_id on the asset and returns it. No MP4 is produced.
//
// To switch to real mode: set FACELESSFORGE_BASE_URL + FACELESSFORGE_API_KEY
// to real values and the real-mode branch below will activate.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STUB_API_KEY = "stub-not-connected";

interface RenderInput {
  asset_id: string;
  title: string;
  script: string;
  scene_breakdown: unknown[];
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
      scene_breakdown: b.scene_breakdown as unknown[],
      stock_footage_terms: b.stock_footage_terms as unknown[],
      captions: {
        short_caption: typeof caps.short_caption === "string" ? caps.short_caption : undefined,
        long_caption: typeof caps.long_caption === "string" ? caps.long_caption : undefined,
      },
      voiceover_notes: b.voiceover_notes ?? null,
    },
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
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub as string;

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

  // Confirm the asset belongs to the caller (RLS will also enforce, but be explicit)
  const { data: asset, error: assetErr } = await supabase
    .from("assets")
    .select("id, user_id, engine_key, render_job_id")
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
  const isStub = !apiKey || apiKey === STUB_API_KEY || !baseUrl;

  let jobId: string;

  if (isStub) {
    jobId = `stub_${crypto.randomUUID()}`;
  } else {
    // ---- Future real-mode branch (not exercised while stub) ----
    try {
      const upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/render`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          asset_id: input.asset_id,
          title: input.title,
          script: input.script,
          scene_breakdown: input.scene_breakdown,
          stock_footage_terms: input.stock_footage_terms,
          captions: input.captions,
          voiceover_notes: input.voiceover_notes,
        }),
      });
      if (!upstream.ok) {
        const txt = await upstream.text();
        return new Response(
          JSON.stringify({ error: `FacelessForge error [${upstream.status}]: ${txt}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const data = await upstream.json();
      jobId = String(data.job_id ?? "");
      if (!jobId) {
        return new Response(JSON.stringify({ error: "FacelessForge did not return job_id" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : "Upstream call failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  const { error: updateErr } = await supabase
    .from("assets")
    .update({ render_job_id: jobId, render_status: "pending" })
    .eq("id", input.asset_id);

  if (updateErr) {
    return new Response(JSON.stringify({ error: updateErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      job_id: jobId,
      status: "pending",
      stub: isStub,
      message: isStub
        ? "Render integration stub — real FacelessForge API not connected yet."
        : undefined,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
