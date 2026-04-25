// Neon Studio — visual direction, scene language, thumbnail concepts,
// and image/video prompt packs.
import { formatFooter } from "./output-footer";

export type VisualStyle =
  | "neon-cyberpunk"
  | "editorial-minimal"
  | "high-contrast-bw"
  | "warm-cinematic"
  | "retro-vhs";

export type NeonPlatform = "instagram" | "tiktok" | "youtube" | "x" | "linkedin";

export type AspectRatio = "9:16" | "1:1" | "4:5" | "16:9" | "1.91:1";

export const STYLE_LABELS: Record<VisualStyle, string> = {
  "neon-cyberpunk": "Neon cyberpunk",
  "editorial-minimal": "Editorial minimal",
  "high-contrast-bw": "High-contrast B&W",
  "warm-cinematic": "Warm cinematic",
  "retro-vhs": "Retro VHS",
};

export const NEON_PLATFORM_LABELS: Record<NeonPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
  linkedin: "LinkedIn",
};

export const ASPECT_LABELS: Record<AspectRatio, string> = {
  "9:16": "9:16 (vertical)",
  "1:1": "1:1 (square)",
  "4:5": "4:5 (feed)",
  "16:9": "16:9 (horizontal)",
  "1.91:1": "1.91:1 (link card)",
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

export interface NeonStudioInput {
  video_topic: string;
  visual_style: VisualStyle;
  platform: NeonPlatform;
  scene_idea: string;
  brand_mood: string;
  color_direction: string;
  reference_style: string;
  aspect_ratio: AspectRatio;
}

export interface NeonStudioOutput {
  visual_concept: string;
  art_direction: { palette: string; lighting: string; texture: string };
  scene_style_guide: string;
  shot_list: string[];
  lighting_notes: string;
  composition_notes: string;
  thumbnail_concepts: string[];
  image_generation_prompts: string[];
  video_generation_prompts: string[];
  negative_prompts: string[];
  distribution_recommendation: string;
  success_metric: string;
}

export function generateNeonStudio(input: NeonStudioInput): NeonStudioOutput {
  const palette = STYLE_PALETTE[input.visual_style];
  const scene = input.scene_idea || input.video_topic || "your scene";
  const isVertical = input.aspect_ratio === "9:16" || input.aspect_ratio === "4:5";
  const platform = NEON_PLATFORM_LABELS[input.platform];
  const moodSuffix = input.brand_mood ? `, mood: ${input.brand_mood}` : "";
  const colorSuffix = input.color_direction ? `, color direction: ${input.color_direction}` : "";
  const refSuffix = input.reference_style ? `, in the style of ${input.reference_style}` : "";

  return {
    visual_concept: `${STYLE_LABELS[input.visual_style]} treatment of "${scene}" for ${platform} at ${input.aspect_ratio}${moodSuffix}.`,
    art_direction: palette,
    scene_style_guide: `Subject ${isVertical ? "centered upper-third" : "on left third"}; ${isVertical ? "lower-third reserved for captions/CTA" : "right negative space reserved for text"}. Single accent color from the palette only. One light source visible in frame; never two.`,
    shot_list: [
      `Establishing wide of "${scene}" — frame for ${input.aspect_ratio}.`,
      `Hero medium close-up isolating the subject of "${scene}".`,
      `Macro insert revealing the "why" of the scene (texture / detail).`,
      `Cutaway B-roll that lets the edit breathe between cuts.`,
    ],
    lighting_notes: palette.lighting + ". Avoid mixed color temperatures unless the style explicitly calls for it.",
    composition_notes: isVertical
      ? "Rule-of-thirds vertically. Eye-line at upper-third intersection. Leave bottom 30% clean for captions."
      : "Rule-of-thirds horizontally. Subject on left vertical line, negative space right for text overlay.",
    thumbnail_concepts: [
      `Bold 3-word phrase from the topic + circled object + face on right (high contrast against ${palette.palette.split("·")[0].trim()}).`,
      `Before/after split — left "${input.video_topic || "before"}" / right "after". One accent color across both sides for unity.`,
      `Single number on screen tied to the proof (e.g. "3X", "$0 → $X") + reaction crop of subject.`,
    ],
    image_generation_prompts: [
      `${STYLE_LABELS[input.visual_style]} editorial photograph of "${scene}", ${input.aspect_ratio} aspect, ${palette.lighting.toLowerCase()}, ${palette.texture.toLowerCase()}${colorSuffix}${refSuffix}, sharp subject focus, professional camera, 35mm.`,
      `Macro detail of the key object in "${scene}", ${STYLE_LABELS[input.visual_style].toLowerCase()} aesthetic, ${palette.palette}, shallow depth of field, single accent light.`,
      `Wide environmental establishing shot of "${scene}", ${STYLE_LABELS[input.visual_style].toLowerCase()}, dramatic ${palette.lighting.toLowerCase()}, no text, no people if possible.`,
    ],
    video_generation_prompts: [
      `Cinematic ${input.aspect_ratio} video of "${scene}", ${STYLE_LABELS[input.visual_style].toLowerCase()} grade, slow push-in over 3 seconds, locked-off camera otherwise, ${palette.lighting.toLowerCase()}, 24fps, anamorphic feel.`,
      `${input.aspect_ratio} B-roll of the macro detail in "${scene}", slow rack focus, ${palette.texture.toLowerCase()}, no on-screen text, 4 seconds.`,
      `${input.aspect_ratio} hero shot of subject of "${scene}", subtle parallax / drift, ${palette.palette}, eye-line at lens, 5 seconds.`,
    ],
    negative_prompts: [
      "no extra fingers, no text artifacts, no watermark",
      "no multiple light sources of mixed color temperature unless intentional",
      "no oversaturation, no plastic skin, no AI smoothing",
      "no busy backgrounds; preserve negative space for overlay text",
    ],
    distribution_recommendation: `Native upload to ${platform} at ${input.aspect_ratio}. Burn captions in. Cross-post the hero frame as a still on adjacent platforms; never repost the same vertical to a horizontal feed.`,
    success_metric: `Thumb-stop rate (3-second view %) ≥ platform median for ${platform}. Track per-shot retention to learn which frame works.`,
  };
}

export function formatNeonStudio(input: NeonStudioInput, out: NeonStudioOutput): string {
  return [
    `TOPIC: ${input.video_topic}`,
    `STYLE: ${STYLE_LABELS[input.visual_style]} · PLATFORM: ${NEON_PLATFORM_LABELS[input.platform]} · ASPECT: ${ASPECT_LABELS[input.aspect_ratio]}`,
    `MOOD: ${input.brand_mood || "—"} · COLOR: ${input.color_direction || "—"} · REFERENCE: ${input.reference_style || "—"}`,
    `SCENE: ${input.scene_idea}`,
    "",
    "VISUAL CONCEPT",
    out.visual_concept,
    "",
    "ART DIRECTION",
    `- Palette:  ${out.art_direction.palette}`,
    `- Lighting: ${out.art_direction.lighting}`,
    `- Texture:  ${out.art_direction.texture}`,
    "",
    `SCENE STYLE GUIDE: ${out.scene_style_guide}`,
    `LIGHTING NOTES: ${out.lighting_notes}`,
    `COMPOSITION NOTES: ${out.composition_notes}`,
    "",
    "SHOT LIST",
    ...out.shot_list.map((s, i) => `${i + 1}. ${s}`),
    "",
    "THUMBNAIL CONCEPTS",
    ...out.thumbnail_concepts.map((t, i) => `${i + 1}. ${t}`),
    "",
    "IMAGE GENERATION PROMPTS",
    ...out.image_generation_prompts.map((p, i) => `${i + 1}. ${p}`),
    "",
    "VIDEO GENERATION PROMPTS",
    ...out.video_generation_prompts.map((p, i) => `${i + 1}. ${p}`),
    "",
    "NEGATIVE PROMPTS",
    ...out.negative_prompts.map((n, i) => `${i + 1}. ${n}`),
    formatFooter({
      nextSteps: [
        `Lock location + props before camera (use the palette swatch as your shopping list).`,
        `Light a test frame and screenshot — confirm on-screen text is readable at thumbnail size.`,
        `Shoot all 4 shots in one block; don't review until you're done with shot 4.`,
        `Edit a single 5-second cut first to validate the rhythm before the full edit.`,
      ],
      distribution: out.distribution_recommendation,
      successMetric: out.success_metric,
    }),
  ].join("\n");
}
