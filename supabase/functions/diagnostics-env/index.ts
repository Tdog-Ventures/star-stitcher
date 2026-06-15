import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type CheckStatus = "OK" | "WARN" | "FAIL";

interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
  details?: any;
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const checks: CheckResult[] = [];

    // 1. Node Environment
    checks.push({
      name: "Node Environment",
      status: "OK",
      message: "Deno runtime active",
    });

    // 2. OpenAI Key
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    checks.push({
      name: "OpenAI API Key",
      status: openaiKey ? (openaiKey.startsWith("sk-") ? "OK" : "WARN") : "FAIL",
      message: openaiKey ? "OPENAI_API_KEY is set" : "OPENAI_API_KEY is not set",
    });

    const ffApiKey = Deno.env.get("FACELESSFORGE_API_KEY");
    checks.push({
      name: "FacelessForge API Key",
      status: ffApiKey ? "OK" : "FAIL",
      message: ffApiKey
        ? "FACELESSFORGE_API_KEY is set"
        : "FACELESSFORGE_API_KEY is not set (required for render-video, render-video-status, render-video-cancel)",
    });

    // 3. FacelessForge Base URL (THE IMPORTANT ONE)
    const base = Deno.env.get("FACELESSFORGE_BASE_URL");
    if (!base) {
      checks.push({
        name: "FacelessForge Base URL",
        status: "FAIL",
        message: "FACELESSFORGE_BASE_URL is not set",
      });
    } else {
      const previewPattern = /preview\.emergentagent\.com/;
      if (previewPattern.test(base)) {
        checks.push({
          name: "FacelessForge Base URL",
          status: "FAIL",
          message:
            "URL is an Emergent preview domain. Use production FacelessForge URL from v3.",
          details: {
            current: base,
            suggestion: "Check v3 project's FACELESSFORGE_BASE_URL",
          },
        });
      } else {
        // Test the endpoints
        const results = [];
        for (const path of ["/health", "/render"]) {
          try {
            const r = await fetch(`${base}${path}`, { method: "GET" });
            const text = await r.text();
            const isHTML = text.includes("<!DOCTYPE") ||
              text.includes("<html") ||
              text.includes("loading-preview");
            results.push({
              url: `${base}${path}`,
              status: r.status,
              isHTML,
              snippet: text.slice(0, 100),
            });
          } catch (e: any) {
            results.push({ url: `${base}${path}`, error: e.message });
          }
        }

        const htmlDetected = results.some((r: any) => r.isHTML);
        checks.push({
          name: "FacelessForge Base URL",
          status: htmlDetected ? "FAIL" : "OK",
          message: htmlDetected
            ? "Configured URL returns HTML (preview shell detected)"
            : "API origin verified",
          details: results,
        });
      }
    }

    // 4. Callback URL
    const callback = Deno.env.get("FACELESSFORGE_CALLBACK_URL");
    checks.push({
      name: "Callback URL",
      status: callback ? "OK" : "WARN",
      message: callback ? "FACELESSFORGE_CALLBACK_URL is set" : "Not set",
    });

    // 5. Storage
    const bucket = Deno.env.get("FACELESSFORGE_ASSET_BUCKET");
    checks.push({
      name: "Asset Storage",
      status: bucket ? "OK" : "WARN",
      message: bucket ? `Bucket: ${bucket}` : "Not set",
    });

    const overall = checks.some((c) => c.status === "FAIL")
      ? "FAIL"
      : checks.some((c) => c.status === "WARN")
      ? "WARN"
      : "OK";

    return new Response(JSON.stringify({ overall, checks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        overall: "FAIL",
        checks: [{ name: "Validator", status: "FAIL", message: err.message }],
      }),
      {
        headers: corsHeaders,
        status: 500,
      },
    );
  }
});
