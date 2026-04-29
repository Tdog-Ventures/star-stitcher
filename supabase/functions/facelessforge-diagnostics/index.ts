// FacelessForge Diagnostics
//
// Validates FACELESSFORGE_BASE_URL formatting and returns the fully
// constructed upstream URLs for the three render endpoints. Never returns
// the API key value — only whether it is configured.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface NormalisationResult {
  raw: string;
  stripped: string;
  had_prefix: boolean;
  had_quotes: boolean;
  had_trailing_slash: boolean;
  had_embedded_endpoint: boolean;
  normalised_base: string | null;
  valid: boolean;
  error: string | null;
}

function normaliseBase(rawBaseUrl: string): NormalisationResult {
  const result: NormalisationResult = {
    raw: rawBaseUrl,
    stripped: "",
    had_prefix: false,
    had_quotes: false,
    had_trailing_slash: false,
    had_embedded_endpoint: false,
    normalised_base: null,
    valid: false,
    error: null,
  };

  let s = rawBaseUrl.trim();
  if (/^FACELESSFORGE_BASE_URL\s*=\s*/.test(s)) {
    result.had_prefix = true;
    s = s.replace(/^FACELESSFORGE_BASE_URL\s*=\s*/, "");
  }
  if (/^['"]|['"]$/.test(s)) {
    result.had_quotes = true;
    s = s.replace(/^['"]|['"]$/g, "");
  }
  s = s.trim();
  result.stripped = s;

  if (!s) {
    result.error = "FACELESSFORGE_BASE_URL is empty";
    return result;
  }

  let url: URL;
  try {
    url = new URL(s);
  } catch {
    result.error = `Invalid URL: '${s}'`;
    return result;
  }

  if (url.pathname.endsWith("/") && url.pathname !== "/") {
    result.had_trailing_slash = true;
  }

  let path = url.pathname.replace(/\/$/, "");
  for (const suffix of [
    "/api/external/render-video/cancel",
    "/api/external/render-video-status",
    "/api/external/render-video",
    "/api/external",
  ]) {
    if (path.endsWith(suffix)) {
      result.had_embedded_endpoint = true;
      path = path.slice(0, -suffix.length);
      break;
    }
  }
  url.pathname = path || "/";
  url.search = "";
  url.hash = "";

  result.normalised_base = url.toString().replace(/\/$/, "");
  result.valid = true;
  return result;
}

function buildUrl(base: string, endpoint: string): string {
  return `${base}${endpoint}`;
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

  const rawBase = Deno.env.get("FACELESSFORGE_BASE_URL") ?? "";
  const apiKey = Deno.env.get("FACELESSFORGE_API_KEY") ?? "";
  const norm = normaliseBase(rawBase);

  const endpoints = norm.valid && norm.normalised_base
    ? {
        render_video: buildUrl(norm.normalised_base, "/api/external/render-video"),
        render_video_status: buildUrl(norm.normalised_base, "/api/external/render-video-status"),
        render_video_cancel: buildUrl(norm.normalised_base, "/api/external/render-video/cancel"),
      }
    : null;

  // Reachability probe (HEAD on the normalised base). Best-effort, never throws.
  let reachable: { ok: boolean; status: number | null; error: string | null } = {
    ok: false,
    status: null,
    error: null,
  };
  if (norm.valid && norm.normalised_base) {
    try {
      const probe = await fetch(norm.normalised_base, { method: "HEAD" });
      reachable = { ok: probe.ok, status: probe.status, error: null };
    } catch (e) {
      reachable = {
        ok: false,
        status: null,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return new Response(
    JSON.stringify({
      ok: norm.valid && Boolean(apiKey),
      api_key_configured: Boolean(apiKey),
      base_url: {
        raw_present: rawBase.length > 0,
        had_prefix: norm.had_prefix,
        had_quotes: norm.had_quotes,
        had_trailing_slash: norm.had_trailing_slash,
        had_embedded_endpoint: norm.had_embedded_endpoint,
        valid: norm.valid,
        normalised: norm.normalised_base,
        error: norm.error,
      },
      endpoints,
      reachable,
    }, null, 2),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
