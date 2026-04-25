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

  it("auto-calculates contiguous timecodes and per-scene durations", () => {
    const out = generateVideoForge({ ...baseInput, mode: "short_form", target_length: "short" });
    let prevEndSeconds = 0;
    out.scene_breakdown.forEach((s, i) => {
      expect(typeof s.duration_seconds).toBe("number");
      expect(s.duration_seconds!).toBeGreaterThan(0);
      expect(s.end_timecode).toMatch(/^\d+:\d{2}$/);

      const [m, sec] = s.timecode.split(":").map(Number);
      const startSeconds = m * 60 + sec;
      if (i === 0) {
        expect(startSeconds).toBe(0);
      } else {
        expect(startSeconds).toBe(prevEndSeconds);
      }
      const [em, esec] = s.end_timecode!.split(":").map(Number);
      prevEndSeconds = em * 60 + esec;
      expect(prevEndSeconds - startSeconds).toBe(s.duration_seconds);
    });
    const total = out.scene_breakdown.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
    expect(total).toBe(30);
  });
});

describe("video-forge validator", () => {
  it("passes a freshly generated output", () => {
    const out = generateVideoForge(baseInput);
    const v = validateVideoForgeOutput(out);
    expect(v.ok).toBe(true);
    expect(v.errors).toEqual([]);
  });

  it("fails on null output", () => {
    const v = validateVideoForgeOutput(null);
    expect(v.ok).toBe(false);
    expect(v.errors.length).toBeGreaterThan(0);
  });

  it("flags missing top-level fields", () => {
    const out = generateVideoForge(baseInput);
    const broken = { ...out, video_title: "", success_metric: "   " };
    const v = validateVideoForgeOutput(broken);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("video_title"))).toBe(true);
    expect(v.errors.some((e) => e.includes("success_metric"))).toBe(true);
  });

  it("flags missing script section", () => {
    const out = generateVideoForge(baseInput);
    const broken = {
      ...out,
      script_sections: { ...out.script_sections, cta: "" },
    };
    const v = validateVideoForgeOutput(broken);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("cta"))).toBe(true);
  });

  it("flags scenes missing required production fields", () => {
    const out = generateVideoForge(baseInput);
    const broken = {
      ...out,
      scene_breakdown: [
        {
          ...out.scene_breakdown[0],
          voiceover_note: "",
          b_roll_or_stock_query: "",
        },
        ...out.scene_breakdown.slice(1),
      ],
    };
    const v = validateVideoForgeOutput(broken);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("voiceover_note"))).toBe(true);
    expect(v.errors.some((e) => e.includes("b_roll_or_stock_query"))).toBe(true);
  });

  it("flags empty scene_breakdown", () => {
    const out = generateVideoForge(baseInput);
    const v = validateVideoForgeOutput({ ...out, scene_breakdown: [] });
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("scene_breakdown"))).toBe(true);
  });

  it("flags empty captions", () => {
    const out = generateVideoForge(baseInput);
    const v = validateVideoForgeOutput({
      ...out,
      captions: { short_caption: "", long_caption: "" },
    });
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("short_caption"))).toBe(true);
    expect(v.errors.some((e) => e.includes("long_caption"))).toBe(true);
  });
});

describe("video-forge speakability", () => {
  it("freshly generated narration contains no instructional verbs at sentence start", () => {
    (["short_form", "long_form", "faceless", "product_demo"] as VideoMode[]).forEach((mode) => {
      const out = generateVideoForge({ ...baseInput, mode });
      const v = validateVideoForgeOutput(out);
      expect(v.ok, `mode=${mode} errors=${v.errors.join(" | ")}`).toBe(true);
    });
  });

  it("flags narration that starts with Explain / Discuss / Show / Introduce", () => {
    const out = generateVideoForge(baseInput);
    const broken = {
      ...out,
      script_sections: {
        ...out.script_sections,
        intro: "Explain why this matters to founders.",
        problem: "Discuss the failure mode in depth.",
      },
      scene_breakdown: [
        { ...out.scene_breakdown[0], narration: "Show the dashboard with the key metric." },
        { ...out.scene_breakdown[1], narration: "Introduce the three-step plan." },
        ...out.scene_breakdown.slice(2),
      ],
    };
    const v = validateVideoForgeOutput(broken);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("explain"))).toBe(true);
    expect(v.errors.some((e) => e.includes("discuss"))).toBe(true);
    expect(v.errors.some((e) => e.includes("show"))).toBe(true);
    expect(v.errors.some((e) => e.includes("introduce"))).toBe(true);
  });

  it("does NOT flag the same verbs used naturally inside a sentence", () => {
    const out = generateVideoForge(baseInput);
    const ok = {
      ...out,
      script_sections: {
        ...out.script_sections,
        insight: "I'll show you what changed when I flipped one thing.",
      },
    };
    const v = validateVideoForgeOutput(ok);
    expect(v.ok).toBe(true);
  });

  it("flags bracketed stage directions left inside narration", () => {
    const out = generateVideoForge(baseInput);
    const broken = {
      ...out,
      script_sections: {
        ...out.script_sections,
        intro: "[Cold open over B-roll] If you're a founder, this matters.",
      },
    };
    const v = validateVideoForgeOutput(broken);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("stage direction"))).toBe(true);
  });

  it("hooks are at most two lines and avoid 'stop scrolling' clichés", () => {
    (["short_form", "long_form", "faceless", "product_demo"] as VideoMode[]).forEach((mode) => {
      const out = generateVideoForge({ ...baseInput, mode });
      const lineCount = out.opening_hook.split(/\n/).filter(Boolean).length;
      expect(lineCount, `mode=${mode}`).toBeLessThanOrEqual(2);
      expect(out.opening_hook.toLowerCase()).not.toContain("stop scrolling");
    });
  });
});

