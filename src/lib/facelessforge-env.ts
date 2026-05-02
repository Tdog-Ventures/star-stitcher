/**
 * FacelessForge environment contract (names only — never store secrets in the client).
 *
 * Configure in Supabase Dashboard → Project Settings → Edge Functions → Secrets:
 * - FACELESSFORGE_BASE_URL — upstream API origin (same normalisation as Edge: optional
 *   `FACELESSFORGE_BASE_URL=` prefix and surrounding quotes are stripped server-side).
 * - FACELESSFORGE_API_KEY — upstream auth header `X-FacelessForge-Key`.
 *
 * Optional (see `api/diagnostics/env` and `supabase/functions/diagnostics-env`):
 * - FACELESSFORGE_CALLBACK_URL
 * - FACELESSFORGE_ASSET_BUCKET
 */
export const FACELESSFORGE_ENV_KEYS = {
  BASE_URL: "FACELESSFORGE_BASE_URL",
  API_KEY: "FACELESSFORGE_API_KEY",
  CALLBACK_URL: "FACELESSFORGE_CALLBACK_URL",
  ASSET_BUCKET: "FACELESSFORGE_ASSET_BUCKET",
} as const;

/** Secrets required for render proxy Edge functions to call upstream. */
export const FACELESSFORGE_REQUIRED_FOR_RENDER = [
  FACELESSFORGE_ENV_KEYS.BASE_URL,
  FACELESSFORGE_ENV_KEYS.API_KEY,
] as const;

function pickString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * User-visible message from `supabase.functions.invoke` result.
 * When the Edge Function returns a non-2xx JSON body, Supabase often still populates `data` with that body.
 */
export function messageFromFunctionsInvoke(data: unknown, error: unknown): string {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const errMsg = pickString(o, "error");
    if (errMsg) {
      const code = pickString(o, "code");
      return code ? `${errMsg} (${code})` : errMsg;
    }
  }
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m.trim();
  }
  return "Request failed";
}
