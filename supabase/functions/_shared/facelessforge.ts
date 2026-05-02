/**
 * FacelessForge proxy helpers (Supabase Edge).
 *
 * Required secrets for render-video / render-video-status / render-video-cancel:
 * - FACELESSFORGE_BASE_URL — upstream API origin (quotes / `KEY=` prefix tolerated)
 * - FACELESSFORGE_API_KEY — sent as X-FacelessForge-Key
 *
 * Optional (callbacks / storage integrations elsewhere):
 * - FACELESSFORGE_CALLBACK_URL, FACELESSFORGE_ASSET_BUCKET
 */

export const FACELESSFORGE_UPSTREAM_TIMEOUT_MS = 55_000;

export type FacelessForgeClientErrorBody = {
  error: string;
  code: string;
  details?: Record<string, unknown>;
};

export function facelessForgeUrl(rawBaseUrl: string, endpoint: string): string | null {
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

export function readFacelessForgeCredentials():
  | { ok: true; apiKey: string; baseUrl: string }
  | { ok: false; missing: ("FACELESSFORGE_BASE_URL" | "FACELESSFORGE_API_KEY")[] } {
  const apiKey = (Deno.env.get("FACELESSFORGE_API_KEY") ?? "").trim();
  const baseUrl = (Deno.env.get("FACELESSFORGE_BASE_URL") ?? "").trim();
  const missing: ("FACELESSFORGE_BASE_URL" | "FACELESSFORGE_API_KEY")[] = [];
  if (!baseUrl) missing.push("FACELESSFORGE_BASE_URL");
  if (!apiKey) missing.push("FACELESSFORGE_API_KEY");
  if (missing.length) return { ok: false, missing };
  return { ok: true, apiKey, baseUrl };
}

export function jsonResponse(
  cors: Record<string, string>,
  status: number,
  body: FacelessForgeClientErrorBody | Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export function facelessForgeNotConfiguredResponse(
  cors: Record<string, string>,
  missing: ("FACELESSFORGE_BASE_URL" | "FACELESSFORGE_API_KEY")[],
): Response {
  return jsonResponse(cors, 503, {
    error:
      "FacelessForge is not configured. Set FACELESSFORGE_BASE_URL and FACELESSFORGE_API_KEY as Supabase Edge Function secrets.",
    code: "FACELESSFORGE_NOT_CONFIGURED",
    details: { missing },
  });
}

export function facelessForgeInvalidBaseUrlResponse(cors: Record<string, string>): Response {
  return jsonResponse(cors, 503, {
    error: "FACELESSFORGE_BASE_URL is missing or not a valid URL after normalisation.",
    code: "FACELESSFORGE_INVALID_BASE_URL",
  });
}

/** Strip control chars and collapse whitespace for logs and bounded client snippets. */
export function safeSnippet(text: string, max = 240): string {
  const oneLine = text
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
}

export async function fetchFacelessForgeUpstream(
  url: string,
  init: RequestInit,
  ms = FACELESSFORGE_UPSTREAM_TIMEOUT_MS,
): Promise<Response> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

export function isAbortError(e: unknown): boolean {
  if (e instanceof Error && e.name === "AbortError") return true;
  if (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") {
    return true;
  }
  return false;
}
