// Shared engine output contracts + asset persistence helper.
//
// Every engine generates a typed object that matches the published
// contract for that engine. We persist it as a versioned JSON envelope
// in `assets.content` so the /assets preview can render it structured,
// while distribution + admin keep working untouched.

export const ENGINE_KEYS = [
  "video_forge",
  "creator_blueprint",
  "creator_launchpad",
  "neon_studio",
  "video_velocity",
  "partner_program",
  "growth_hub",
  "ethinx_showcase",
  "offer",
] as const;
export type EngineKey = (typeof ENGINE_KEYS)[number];

export const ENGINE_TYPES: Record<EngineKey, string> = {
  video_forge: "video_script",
  creator_blueprint: "creator_blueprint",
  creator_launchpad: "launch_plan",
  neon_studio: "visual_brief",
  video_velocity: "video_batch_plan",
  partner_program: "partner_brief",
  growth_hub: "growth_experiment",
  ethinx_showcase: "showcase_asset",
  offer: "offer",
};

/**
 * Versioned envelope written to assets.content.
 * Keeps a human-readable markdown copy alongside the structured output
 * so legacy renderers and exports still work.
 */
export interface AssetEnvelope<T = unknown> {
  v: 1;
  engine_key: EngineKey;
  type: string;
  output: T;
  markdown: string;
}

export function buildEnvelope<T>(
  engineKey: EngineKey,
  output: T,
  markdown: string,
): string {
  const envelope: AssetEnvelope<T> = {
    v: 1,
    engine_key: engineKey,
    type: ENGINE_TYPES[engineKey],
    output,
    markdown,
  };
  return JSON.stringify(envelope);
}

/** Best-effort parse of stored content back into an envelope. */
export function tryParseEnvelope(content: string | null | undefined): AssetEnvelope | null {
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as AssetEnvelope;
    if (parsed && parsed.v === 1 && typeof parsed.output === "object") {
      return parsed;
    }
  } catch {
    /* fall through */
  }
  return null;
}
