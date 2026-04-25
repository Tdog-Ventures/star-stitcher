// Neon Studio — turns visual style + scene idea + platform
// into a directable visual brief / scene direction.

export type VisualStyle =
  | "neon-cyberpunk"
  | "editorial-minimal"
  | "high-contrast-bw"
  | "warm-cinematic"
  | "retro-vhs";

export type Platform = "instagram" | "tiktok" | "youtube" | "x" | "linkedin";

export const STYLE_LABELS: Record<VisualStyle, string> = {
  "neon-cyberpunk": "Neon cyberpunk",
  "editorial-minimal": "Editorial minimal",
  "high-contrast-bw": "High-contrast B&W",
  "warm-cinematic": "Warm cinematic",
  "retro-vhs": "Retro VHS",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
};

const PLATFORM_SPEC: Record<
  Platform,
  { ratio: string; safeZone: string; durationOrSize: string }
> = {
  instagram: {
    ratio: "4:5 feed / 9:16 reel",
    safeZone: "Top 220px and bottom 320px reserved for UI",
    durationOrSize: "Reel 7–15s, hook in first 1.5s",
  },
  tiktok: {
    ratio: "9:16",
    safeZone: "Right 96px (action bar) + bottom 240px (caption)",
    durationOrSize: "15–30s, hook + payoff under 7s",
  },
  youtube: {
    ratio: "16:9 thumbnail / 9:16 Shorts",
    safeZone: "Bottom-right reserved for duration badge",
    durationOrSize: "Thumbnail readable at 320×180px",
  },
  x: {
    ratio: "16:9 inline / 1:1 timeline",
    safeZone: "No platform UI overlay; full canvas",
    durationOrSize: "Single hero frame, ≤ 4s if video",
  },
  linkedin: {
    ratio: "1.91:1 share / 4:5 native video",
    safeZone: "Avoid bottom 64px (engagement bar on mobile)",
    durationOrSize: "Hero + 2 supporting frames, captions burned in",
  },
};

const STYLE_PALETTE: Record<VisualStyle, { palette: string; lighting: string; texture: string }> = {
  "neon-cyberpunk": {
    palette: "#0A0A12 base · #00FFE0 accent · #FF2D95 secondary",
    lighting: "Hard rim lights from 2 sides, deep shadows, magenta haze",
    texture: "Subtle film grain + chromatic aberration on edges",
  },
  "editorial-minimal": {
    palette: "Off-white #F4F2EE · charcoal #1E1E1E · one accent",
    lighting: "Soft north-window daylight, single key, no fill",
    texture: "Clean grain, no overlays, sharp typography",
  },
  "high-contrast-bw": {
    palette: "Pure black + pure white only",
    lighting: "Single hard key, deep blacks, no mid-tones",
    texture: "Coarse grain (~ISO 1600), heavy contrast curve",
  },
  "warm-cinematic": {
    palette: "Teal shadows · orange highlights · cream mid-tones",
    lighting: "Golden hour, practicals in frame, lens flare allowed",
    texture: "Anamorphic feel, slight halation on highlights",
  },
  "retro-vhs": {
    palette: "Saturated reds + cyan blues, washed blacks",
    lighting: "Flat front-light, hot spots ok",
    texture: "Scan lines, tape jitter, date stamp overlay",
  },
};

export interface NeonInput {
  visualStyle: VisualStyle;
  scene: string;
  platform: Platform;
}

interface SceneDirection {
  shotList: string[];
  composition: string;
  motion: string;
  onScreenText: string;
  doNot: string[];
}

export function generateSceneBrief(input: NeonInput): SceneDirection {
  const scene = input.scene || "your scene";
  const isVertical = input.platform === "tiktok" ||
    input.platform === "instagram";
  return {
    shotList: [
      `Establishing: wide of "${scene}" — frame for ${isVertical ? "vertical" : "horizontal"} read`,
      `Hero: medium close-up isolating the subject of "${scene}"`,
      `Detail: macro insert that reveals the "why" of the scene`,
      `Cutaway: B-roll that lets the edit breathe between cuts`,
    ],
    composition: isVertical
      ? "Subject vertically centered upper-third; leave lower-third for captions and CTA."
      : "Rule-of-thirds; subject on left vertical line, negative space right for text.",
    motion: isVertical
      ? "Locked-off or slow push-in. No swish-pans. Cut on action every 2–3s."
      : "One slow dolly per shot. Avoid handheld unless tone calls for it.",
    onScreenText: `One line, ≤ 5 words. Anchor to the promise of "${scene}". Burn captions in for ${PLATFORM_LABELS[input.platform]}.`,
    doNot: [
      "No multi-line text overlays.",
      "No more than one accent color from the palette.",
      "No stock music with vocals on top of dialogue.",
    ],
  };
}

export function formatSceneBrief(input: NeonInput, dir: SceneDirection): string {
  const spec = PLATFORM_SPEC[input.platform];
  const style = STYLE_PALETTE[input.visualStyle];
  return [
    `STYLE: ${STYLE_LABELS[input.visualStyle]}`,
    `PLATFORM: ${PLATFORM_LABELS[input.platform]}`,
    `SCENE: ${input.scene}`,
    "",
    "PLATFORM SPEC",
    `- Ratio: ${spec.ratio}`,
    `- Safe zone: ${spec.safeZone}`,
    `- Duration / size: ${spec.durationOrSize}`,
    "",
    "VISUAL DIRECTION",
    `- Palette: ${style.palette}`,
    `- Lighting: ${style.lighting}`,
    `- Texture: ${style.texture}`,
    "",
    "SHOT LIST",
    ...dir.shotList.map((s, i) => `${i + 1}. ${s}`),
    "",
    `COMPOSITION: ${dir.composition}`,
    `MOTION: ${dir.motion}`,
    `ON-SCREEN TEXT: ${dir.onScreenText}`,
    "",
    "DO NOT",
    ...dir.doNot.map((d, i) => `${i + 1}. ${d}`),
  ].join("\n");
}
