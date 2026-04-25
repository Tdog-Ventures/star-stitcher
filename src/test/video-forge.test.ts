import { describe, it, expect } from "vitest";
import {
  generateVideoForge,
  formatVideoForge,
  validateVideoForgeOutput,
  type VideoForgeInput,
  type VideoMode,
} from "@/lib/video-forge";

const baseInput: VideoForgeInput = {
  video_goal: "marketing",
  topic: "Cold email that books calls",
  target_audience: "B2B SaaS founders",
  platform: "youtube",
  format: "long_form",
  tone: "bold",
  target_length: "medium",
  desired_outcome: "Send one email today that gets a reply",
};

const REQUIRED_FIELDS: (keyof ReturnType<typeof generateVideoForge>)[] = [
  "mode",
  "video_title",
  "core_angle",
  "viewer_promise",
  "opening_hook",
  "full_script",
  "script_sections",
  "scene_breakdown",
  "stock_footage_terms",
  "on_screen_text_overlays",
  "voiceover_notes",
  "captions",
  "thumbnail_concepts",
  "hashtags",
  "distribution_recommendation",
  "success_metric",
];

describe("video-forge generator", () => {
  it("returns all required output fields", () => {
    const out = generateVideoForge(baseInput);
    REQUIRED_FIELDS.forEach((f) => expect(out[f]).toBeDefined());
  });

  it.each<[VideoMode, number]>([
    ["short_form", 5],
    ["long_form", 8],
    ["faceless", 7],
    ["product_demo", 7],
  ])("mode %s produces a meaningful scene plan", (mode, minScenes) => {
    const out = generateVideoForge({ ...baseInput, mode });
    expect(out.mode).toBe(mode);
    expect(out.scene_breakdown.length).toBeGreaterThanOrEqual(Math.min(minScenes, 5));
    out.scene_breakdown.forEach((s) => {
      expect(s.scene_purpose).toBeTruthy();
      expect(s.narration).toBeTruthy();
      expect(s.b_roll_or_stock_query).toBeTruthy();
      expect(s.voiceover_note).toBeTruthy();
      expect(s.timecode).toMatch(/^\d+:\d{2}$/);
    });
  });

  it("each mode produces a distinct opening hook", () => {
    const hooks = (["short_form", "long_form", "faceless", "product_demo"] as VideoMode[]).map(
      (mode) => generateVideoForge({ ...baseInput, mode }).opening_hook,
    );
    expect(new Set(hooks).size).toBe(hooks.length);
  });

  it("full_script includes the hook and the CTA", () => {
    const out = generateVideoForge(baseInput);
    expect(out.full_script).toContain(out.opening_hook);
    expect(out.full_script).toContain(out.script_sections.cta);
  });

  it("aggregates unique stock footage terms from scenes", () => {
    const out = generateVideoForge(baseInput);
    expect(out.stock_footage_terms.length).toBeGreaterThan(0);
    expect(new Set(out.stock_footage_terms).size).toBe(out.stock_footage_terms.length);
  });

  it("formatVideoForge surfaces the new sections", () => {
    const out = generateVideoForge(baseInput);
    const md = formatVideoForge(baseInput, out);
    expect(md).toContain("FULL SCRIPT");
    expect(md).toContain("STOCK FOOTAGE / B-ROLL SEARCH TERMS");
    expect(md).toContain("VOICEOVER NOTES");
    expect(md).toContain("ON-SCREEN TEXT OVERLAYS");
  });

  it("infers mode from format/goal when not provided", () => {
    expect(generateVideoForge({ ...baseInput, mode: undefined, format: "faceless" }).mode).toBe(
      "faceless",
    );
    expect(
      generateVideoForge({
        ...baseInput,
        mode: undefined,
        video_goal: "product_demo",
        format: "talking_head",
      }).mode,
    ).toBe("product_demo");
    expect(
      generateVideoForge({
        ...baseInput,
        mode: undefined,
        format: "long_form",
      }).mode,
    ).toBe("long_form");
  });
});
