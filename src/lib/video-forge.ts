// Deterministic, rule-based video script generator.
// No AI calls — produces a structured script from form inputs.
import { formatFooter } from "./engines/output-footer";

export type VideoGoal =
  | "marketing"
  | "content"
  | "educational"
  | "sales";

export type VideoTone = "professional" | "casual" | "aggressive" | "storytelling";

export type VideoLength = "short" | "medium" | "long";

export interface VideoForgeInput {
  goal: VideoGoal;
  topic: string;
  audience: string;
  tone: VideoTone;
  length: VideoLength;
}

export interface VideoForgeOutput {
  title: string;
  hook: string;
  mainPoints: string[];
  cta: string;
  captions: string;
  hashtags: string[];
}

export const GOAL_LABELS: Record<VideoGoal, string> = {
  marketing: "Marketing video",
  content: "Content video",
  educational: "Educational video",
  sales: "Sales video",
};

export const TONE_LABELS: Record<VideoTone, string> = {
  professional: "Professional",
  casual: "Casual",
  aggressive: "Aggressive",
  storytelling: "Storytelling",
};

export const LENGTH_LABELS: Record<VideoLength, string> = {
  short: "Short (≈30s)",
  medium: "Medium (60–90s)",
  long: "Long (3–5 min)",
};

const POINTS_BY_LENGTH: Record<VideoLength, number> = {
  short: 3,
  medium: 4,
  long: 6,
};

function buildHook(input: VideoForgeInput): string {
  const { tone, topic, audience, goal } = input;
  const who = audience || "you";
  switch (tone) {
    case "aggressive":
      return `Stop scrolling. If you're ${who} and you care about ${topic}, this 60 seconds will change how you think about it.`;
    case "storytelling":
      return `Six months ago, ${who} couldn't crack ${topic}. Here's exactly what changed.`;
    case "casual":
      return `Quick one for ${who}: here's the simplest way to think about ${topic} right now.`;
    case "professional":
    default:
      return `In this ${GOAL_LABELS[goal].toLowerCase()}, we break down ${topic} for ${who} — clearly and without fluff.`;
  }
}

function buildPoints(input: VideoForgeInput): string[] {
  const { goal, topic, length } = input;
  const target = POINTS_BY_LENGTH[length];
  const base: Record<VideoGoal, string[]> = {
    marketing: [
      `Why ${topic} matters right now`,
      `The #1 mistake most people make with ${topic}`,
      `A simple framework to get ${topic} right`,
      `Real example: how this looks in practice`,
      `What to avoid when scaling ${topic}`,
      `The 30-day plan to make ${topic} compounding`,
    ],
    content: [
      `What ${topic} actually is (and isn't)`,
      `The 3 building blocks of ${topic}`,
      `One contrarian take on ${topic}`,
      `Tools and resources for ${topic}`,
      `Common myths about ${topic}, debunked`,
      `Where ${topic} is going next`,
    ],
    educational: [
      `Definition: ${topic} in one sentence`,
      `Why ${topic} works (the underlying principle)`,
      `Step-by-step: how to apply ${topic}`,
      `Worked example with numbers`,
      `Common pitfalls and how to avoid them`,
      `Recap and next learning step`,
    ],
    sales: [
      `The exact problem ${topic} solves`,
      `Why current solutions fall short`,
      `How our approach to ${topic} is different`,
      `Proof: results customers got`,
      `What's included, in plain language`,
      `Risk reversal: why there's no downside to trying`,
    ],
  };
  return base[goal].slice(0, target);
}

function buildCta(input: VideoForgeInput): string {
  switch (input.goal) {
    case "sales":
      return `Tap the link to get ${input.topic} working for you this week.`;
    case "marketing":
      return `Follow for more on ${input.topic} — and DM "${input.topic}" to get the playbook.`;
    case "educational":
      return `Save this so you can apply ${input.topic} the next time you need it.`;
    case "content":
    default:
      return `If this helped, share it with one person who's working on ${input.topic}.`;
  }
}

function buildHashtags(input: VideoForgeInput): string[] {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join("");
  const topicTag = slug(input.topic) || "topic";
  const audienceTag = slug(input.audience) || "founders";
  const goalTag = `${input.goal}video`;
  return Array.from(
    new Set([
      `#${topicTag}`,
      `#${audienceTag}`,
      `#${goalTag}`,
      "#ethinx",
      "#videoforge",
    ]),
  );
}

function buildTitle(input: VideoForgeInput): string {
  const topic = input.topic.trim() || "your next video";
  switch (input.goal) {
    case "sales":
      return `${topic} — the offer breakdown`;
    case "educational":
      return `${topic}, explained`;
    case "marketing":
      return `${topic}: what most people get wrong`;
    case "content":
    default:
      return `${topic} in 60 seconds`;
  }
}

function buildCaptions(output: Omit<VideoForgeOutput, "captions" | "hashtags">): string {
  const lines = [
    `▶ ${output.title}`,
    "",
    output.hook,
    "",
    ...output.mainPoints.map((p, i) => `${i + 1}. ${p}`),
    "",
    `→ ${output.cta}`,
  ];
  return lines.join("\n");
}

export function generateVideoScript(input: VideoForgeInput): VideoForgeOutput {
  const title = buildTitle(input);
  const hook = buildHook(input);
  const mainPoints = buildPoints(input);
  const cta = buildCta(input);
  const partial = { title, hook, mainPoints, cta };
  return {
    ...partial,
    captions: buildCaptions(partial),
    hashtags: buildHashtags(input),
  };
}

export function formatScriptAsContent(out: VideoForgeOutput): string {
  return [
    `TITLE: ${out.title}`,
    "",
    "HOOK:",
    out.hook,
    "",
    "MAIN POINTS:",
    ...out.mainPoints.map((p, i) => `${i + 1}. ${p}`),
    "",
    "CTA:",
    out.cta,
    "",
    "CAPTIONS:",
    out.captions,
    "",
    "HASHTAGS:",
    out.hashtags.join(" "),
    formatFooter({
      nextSteps: [
        `Read the hook out loud — if it doesn't earn the next 5 seconds, rewrite it.`,
        `Record one take focused on the hook + first main point only. Review before continuing.`,
        `Burn the captions into the final cut; do not rely on auto-captions.`,
        `Schedule the post via Distribution before the day is over.`,
      ],
      distribution: `Native upload (no link in caption — link in pinned comment / bio). Re-cut a 7-second teaser for the second platform after 48h.`,
      successMetric: `3-second view rate ≥ 65%. Watch which main point holds retention — that's the next video's spine.`,
    }),
  ].join("\n");
}
