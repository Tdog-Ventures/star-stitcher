// Video Forge Polish — DeepSeek-powered narration rewriter.
//
// Receives a deterministic VideoForgeOutput "draft" plus the original
// VideoForgeInput, asks DeepSeek to rewrite hook/viewer_promise/cta and each
// scene's narration so the words are genuinely about the topic for the chosen
// goal. Structure (timecodes, scene count, on-screen text, B-roll, hashtags,
// captions, distribution, success_metric) is preserved exactly.
//
// On any upstream failure or malformed response, the draft is returned
// unchanged with polished=false and a reason — the UI never breaks.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";
const UPSTREAM_TIMEOUT_MS = 12_000;

interface SceneIn {
  scene_number: number;
  duration_seconds?: number;
  scene_purpose: string;
  narration: string;
}

interface DraftIn {
  opening_hook: string;
  viewer_promise: string;
  full_script?: string;
  scene_breakdown: SceneIn[];
  script_sections: { cta: string; [k: string]: string };
  [k: string]: unknown;
}

interface InputIn {
  video_goal: string;
  topic: string;
  target_audience: string;
  platform: string;
  format: string;
  tone: string;
  target_length: string;
  desired_outcome: string;
  mode?: string;
}

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fallback(draft: DraftIn, reason: string) {
  return ok({ ...draft, polished: false, polish_reason: reason });
}

function buildPrompt(input: InputIn, draft: DraftIn): string {
  const sceneBudget = draft.scene_breakdown
    .map((s) => {
      const secs = s.duration_seconds ?? 6;
      const wordCap = Math.max(8, Math.round(secs * 2.5));
      return `  - scene ${s.scene_number} (${s.scene_purpose}, ~${secs}s, max ~${wordCap} words): current="${s.narration.replace(/"/g, "'")}"`;
    })
    .join("\n");

  return [
    `Topic: ${input.topic}`,
    `Goal: ${input.video_goal}`,
    `Audience (DO NOT name them in the narration): ${input.target_audience || "general"}`,
    `Desired outcome: ${input.desired_outcome || "(not specified)"}`,
    `Platform: ${input.platform} · Format: ${input.format} · Tone: ${input.tone} · Length: ${input.target_length}`,
    "",
    "Rewrite the following so each line is GENUINELY about the topic.",
    "- For Education/Tutorial: teach a real, specific fact about the topic in each scene.",
    "- For Marketing/Sales: sell the desired outcome with topic-specific proof.",
    "- For Thought leadership: a sharp, defensible take about the topic.",
    "- Never address the audience by name; write so any viewer can hear it.",
    "- No motivational filler ('grinding', 'ship one experiment a week', generic loops). Replace with topic substance.",
    "- Keep it speakable. Respect the per-scene word cap.",
    "",
    `Current hook: ${draft.opening_hook}`,
    `Current viewer promise: ${draft.viewer_promise}`,
    `Current CTA: ${draft.script_sections.cta}`,
    "",
    "Scenes to rewrite:",
    sceneBudget,
  ].join("\n");
}

const RESPONSE_SCHEMA_HINT = `Return ONLY valid JSON in this exact shape:
{
  "hook": "string",
  "viewer_promise": "string",
  "cta": "string",
  "scenes": [{ "scene_number": number, "narration": "string" }]
}`;

interface PatchShape {
  hook?: string;
  viewer_promise?: string;
  cta?: string;
  scenes?: Array<{ scene_number: number; narration: string }>;
}

function applyPatch(draft: DraftIn, patch: PatchShape): DraftIn {
  const sceneMap = new Map<number, string>();
  for (const s of patch.scenes ?? []) {
    if (typeof s?.scene_number === "number" && typeof s?.narration === "string") {
      sceneMap.set(s.scene_number, s.narration.trim());
    }
  }
  const scene_breakdown = (draft.scene_breakdown as Array<Record<string, unknown>>).map(
    (s) => {
      const n = sceneMap.get(s.scene_number as number);
      return n ? { ...s, narration: n } : s;
    },
  );
  const cta =
    typeof patch.cta === "string" && patch.cta.trim()
      ? patch.cta.trim()
      : draft.script_sections.cta;
  const script_sections = { ...draft.script_sections, cta };
  const opening_hook =
    typeof patch.hook === "string" && patch.hook.trim()
      ? patch.hook.trim()
      : draft.opening_hook;
  const viewer_promise =
    typeof patch.viewer_promise === "string" && patch.viewer_promise.trim()
      ? patch.viewer_promise.trim()
      : draft.viewer_promise;

  // Rebuild full_script so saved markdown reflects polished narration.
  const oldFull = typeof draft.full_script === "string" ? draft.full_script : "";
  const headerMatch = oldFull.match(/^\[[^\]]+\]/);
  const header = headerMatch ? headerMatch[0] : "[SHORT-FORM SCRIPT]";
  const lines: string[] = [header, "", `HOOK: ${opening_hook}`, ""];
  for (const s of scene_breakdown as Array<Record<string, unknown>>) {
    lines.push(
      `Scene ${s.scene_number} · ${s.timecode} · ${s.scene_purpose}`,
    );
    lines.push(String(s.narration ?? ""));
    if (s.on_screen_text) lines.push(`[on-screen: ${s.on_screen_text}]`);
    lines.push("");
  }
  lines.push(`CTA: ${cta}`);
  const full_script = lines.join("\n");

  return {
    ...draft,
    opening_hook,
    viewer_promise,
    script_sections,
    scene_breakdown: scene_breakdown as DraftIn["scene_breakdown"],
    full_script,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return ok({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return ok({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return ok({ error: "Unauthorized" }, 401);
  }

  let body: { input?: InputIn; draft?: DraftIn };
  try {
    body = await req.json();
  } catch {
    return ok({ error: "Invalid JSON" }, 400);
  }
  const input = body.input;
  const draft = body.draft;
  if (!input || !draft || !Array.isArray(draft.scene_breakdown)) {
    return ok({ error: "input and draft are required" }, 400);
  }

  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) {
    return fallback(draft, "DEEPSEEK_API_KEY not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(DEEPSEEK_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content:
              `You are a senior short-form video script editor. ${RESPONSE_SCHEMA_HINT}`,
          },
          { role: "user", content: buildPrompt(input, draft) },
        ],
      }),
    });
    clearTimeout(timeout);

    const text = await upstream.text();
    if (!upstream.ok) {
      console.error("[video-forge-polish] upstream", upstream.status, text);
      return fallback(draft, `DeepSeek ${upstream.status}`);
    }

    let parsed: { choices?: Array<{ message?: { content?: string } }> };
    try {
      parsed = JSON.parse(text);
    } catch {
      return fallback(draft, "Non-JSON response from DeepSeek");
    }
    const content = parsed.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return fallback(draft, "Empty content from DeepSeek");
    }
    let patch: PatchShape;
    try {
      patch = JSON.parse(content);
    } catch {
      return fallback(draft, "Patch was not valid JSON");
    }

    const polished = applyPatch(draft, patch);
    return ok({ ...polished, polished: true });
  } catch (e) {
    clearTimeout(timeout);
    const reason =
      e instanceof Error
        ? e.name === "AbortError"
          ? "DeepSeek timed out"
          : e.message
        : "Unknown error";
    console.error("[video-forge-polish] failed", reason);
    return fallback(draft, reason);
  }
});
