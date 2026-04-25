// Video Velocity — turns batch topic + count + platform
// into a per-video production plan for one filming session.
import { formatFooter } from "./output-footer";

export type VelocityPlatform = "tiktok" | "reels" | "shorts" | "linkedin" | "x";

export const VELOCITY_PLATFORM_LABELS: Record<VelocityPlatform, string> = {
  tiktok: "TikTok",
  reels: "Instagram Reels",
  shorts: "YouTube Shorts",
  linkedin: "LinkedIn video",
  x: "X video",
};

const PLATFORM_LENGTH: Record<VelocityPlatform, string> = {
  tiktok: "20–35s, vertical 9:16",
  reels: "15–30s, vertical 9:16",
  shorts: "30–45s, vertical 9:16",
  linkedin: "60–90s, square 1:1 or 9:16",
  x: "30–60s, 16:9 or 9:16",
};

const PLATFORM_HOOK_RULE: Record<VelocityPlatform, string> = {
  tiktok: "Visual hook in frame 1. No intro card.",
  reels: "Pattern-interrupt motion + bold text in first second.",
  shorts: "Spoken hook + visual change within 2s.",
  linkedin: "Stand-alone first line — must read as a thumb-stop in feed.",
  x: "First 4s must work without sound (autoplay muted).",
};

const ANGLES = [
  { kind: "Mistake", template: (t: string) => `The #1 mistake people make about ${t}` },
  { kind: "Contrarian", template: (t: string) => `Why the common advice on ${t} is wrong` },
  { kind: "Framework", template: (t: string) => `A 3-step way to do ${t}` },
  { kind: "Case study", template: (t: string) => `Real example of ${t} working` },
  { kind: "Myth-bust", template: (t: string) => `The biggest myth about ${t}` },
  { kind: "Shortcut", template: (t: string) => `One template that makes ${t} faster` },
  { kind: "Recap", template: (t: string) => `Best lessons from this week on ${t}` },
  { kind: "Behind-the-scenes", template: (t: string) => `How I actually run ${t}` },
  { kind: "Q&A", template: (t: string) => `Answering the most-asked question about ${t}` },
  { kind: "Prediction", template: (t: string) => `Where ${t} is going next` },
  { kind: "Compare", template: (t: string) => `Old way vs new way to do ${t}` },
  { kind: "Anti-pattern", template: (t: string) => `Things to STOP doing in ${t}` },
];

export interface VelocityInput {
  batchTopic: string;
  videoCount: string; // string from select; coerced
  platform: VelocityPlatform;
}

export interface VelocityVideo {
  index: number;
  angle: string;
  workingTitle: string;
  hook: string;
  beat1: string;
  beat2: string;
  cta: string;
}

interface VelocityBatch {
  videos: VelocityVideo[];
  shoot: { setup: string; wardrobe: string; rollOrder: string[]; estimatedTime: string };
  publish: { cadence: string; firstPost: string };
}

export function generateBatch(input: VelocityInput): VelocityBatch {
  const topic = input.batchTopic || "your topic";
  const count = Math.min(Math.max(parseInt(input.videoCount, 10) || 5, 1), ANGLES.length);
  const selected = ANGLES.slice(0, count);

  const videos: VelocityVideo[] = selected.map((a, i) => ({
    index: i + 1,
    angle: a.kind,
    workingTitle: a.template(topic),
    hook: `${a.kind === "Mistake" ? "Stop." : a.kind === "Contrarian" ? "Hot take:" : "Quick one:"} ${a.template(topic).toLowerCase()}.`,
    beat1: `Name it — be specific about ${topic}, no generic advice.`,
    beat2: `Show it — give one concrete example or number tied to ${topic}.`,
    cta: i === count - 1
      ? `Follow for the full ${topic} series — DM "${topic}" for the playbook.`
      : `Save this for later. Tomorrow: ${selected[i + 1]?.kind ?? "next angle"}.`,
  }));

  const minutesPerVideo = 12; // rough one-take + reset budget
  return {
    videos,
    shoot: {
      setup: `Single static camera, eye-line at lens, ring light + one rim. ${PLATFORM_HOOK_RULE[input.platform]}`,
      wardrobe: "Same outfit + same background for entire batch (continuity = thumb-stop consistency).",
      rollOrder: [
        "Warm up with #1 (most familiar angle)",
        "Hardest angle second (highest energy)",
        "Save Q&A / Recap for last (lowest cognitive load)",
      ],
      estimatedTime: `≈ ${count * minutesPerVideo} min camera time + 30 min reset.`,
    },
    publish: {
      cadence: `1 video / day on ${VELOCITY_PLATFORM_LABELS[input.platform]} — same time slot to train the algorithm.`,
      firstPost: "Post the Mistake angle first — historically the highest CTR opener.",
    },
  };
}

export function formatBatch(input: VelocityInput, plan: VelocityBatch): string {
  return [
    `BATCH TOPIC: ${input.batchTopic}`,
    `PLATFORM: ${VELOCITY_PLATFORM_LABELS[input.platform]} (${PLATFORM_LENGTH[input.platform]})`,
    `VIDEO COUNT: ${plan.videos.length}`,
    "",
    "VIDEOS",
    ...plan.videos.flatMap((v) => [
      `--- #${v.index} · ${v.angle} ---`,
      `Title: ${v.workingTitle}`,
      `Hook:  ${v.hook}`,
      `Beat1: ${v.beat1}`,
      `Beat2: ${v.beat2}`,
      `CTA:   ${v.cta}`,
      "",
    ]),
    "SHOOT PLAN",
    `- Setup: ${plan.shoot.setup}`,
    `- Wardrobe: ${plan.shoot.wardrobe}`,
    "- Roll order:",
    ...plan.shoot.rollOrder.map((r, i) => `  ${i + 1}. ${r}`),
    `- Estimated: ${plan.shoot.estimatedTime}`,
    "",
    "PUBLISH PLAN",
    `- Cadence: ${plan.publish.cadence}`,
    `- First post: ${plan.publish.firstPost}`,
  ].join("\n");
}
