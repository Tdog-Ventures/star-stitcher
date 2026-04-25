// VIDEO FORGE — generates the core video concept, script, and production plan.
// Deterministic, no AI calls. Returns a structured object matching the
// public contract; format helpers produce a human-readable markdown copy.

import { formatFooter } from "./engines/output-footer";

export type VideoGoal =
  | "marketing"
  | "education"
  | "sales"
  | "entertainment"
  | "tutorial"
  | "product_demo"
  | "thought_leadership";

export type VideoPlatform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "linkedin"
  | "facebook"
  | "x";

export type VideoFormat =
  | "short_form"
  | "long_form"
  | "faceless"
  | "talking_head"
  | "avatar"
  | "documentary"
  | "explainer";

export type VideoTone =
  | "professional"
  | "bold"
  | "casual"
  | "cinematic"
  | "storytelling"
  | "controversial"
  | "educational";

export type VideoLength = "short" | "medium" | "long";

export const GOAL_LABELS: Record<VideoGoal, string> = {
  marketing: "Marketing",
  education: "Education",
  sales: "Sales",
  entertainment: "Entertainment",
  tutorial: "Tutorial",
  product_demo: "Product demo",
  thought_leadership: "Thought leadership",
};

export const PLATFORM_LABELS: Record<VideoPlatform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  x: "X",
};

export const FORMAT_LABELS: Record<VideoFormat, string> = {
  short_form: "Short-form",
  long_form: "Long-form",
  faceless: "Faceless",
  talking_head: "Talking head",
  avatar: "AI avatar",
  documentary: "Documentary",
  explainer: "Explainer",
};

export const TONE_LABELS: Record<VideoTone, string> = {
  professional: "Professional",
  bold: "Bold",
  casual: "Casual",
  cinematic: "Cinematic",
  storytelling: "Storytelling",
  controversial: "Controversial",
  educational: "Educational",
};

export const LENGTH_LABELS: Record<VideoLength, string> = {
  short: "Short (≈30s)",
  medium: "Medium (60–90s)",
  long: "Long (3–5 min)",
};

export interface VideoForgeInput {
  video_goal: VideoGoal;
  topic: string;
  target_audience: string;
  platform: VideoPlatform;
  format: VideoFormat;
  tone: VideoTone;
  target_length: VideoLength;
  desired_outcome: string;
}

export interface ScriptSections {
  intro: string;
  problem: string;
  insight: string;
  proof: string;
  solution: string;
  cta: string;
}

export interface SceneBreakdownItem {
  scene_number: number;
  scene_purpose: string;
  narration: string;
  suggested_visual: string;
  b_roll_or_stock_query: string;
  on_screen_text: string;
}

export interface VideoForgeOutput {
  video_title: string;
  core_angle: string;
  viewer_promise: string;
  opening_hook: string;
  script_sections: ScriptSections;
  scene_breakdown: SceneBreakdownItem[];
  captions: { short_caption: string; long_caption: string };
  thumbnail_concepts: string[];
  hashtags: string[];
  distribution_recommendation: string;
  success_metric: string;
}

const SCENE_COUNT_BY_LENGTH: Record<VideoLength, number> = {
  short: 4,
  medium: 6,
  long: 9,
};

function buildHook(input: VideoForgeInput): string {
  const who = input.target_audience || "you";
  const topic = input.topic || "this";
  switch (input.tone) {
    case "controversial":
      return `Stop. Most ${who} are wrong about ${topic} — here's the proof in 60 seconds.`;
    case "bold":
      return `If you're ${who} and you care about ${topic}, you have one job in the next 30 seconds.`;
    case "storytelling":
      return `Six months ago, ${who} couldn't crack ${topic}. Here's exactly what changed.`;
    case "casual":
      return `Quick one for ${who}: the simplest way to think about ${topic} right now.`;
    case "cinematic":
      return `${topic}. Three letters, one fight. This is how ${who} win it.`;
    case "educational":
      return `In the next ${input.target_length === "short" ? "30 seconds" : "few minutes"}, ${who} will understand ${topic} better than 90% of the field.`;
    case "professional":
    default:
      return `In this ${GOAL_LABELS[input.video_goal].toLowerCase()} video, we break down ${topic} for ${who} — clearly, no fluff.`;
  }
}

function buildScriptSections(input: VideoForgeInput): ScriptSections {
  const who = input.target_audience || "your viewer";
  const topic = input.topic || "the topic";
  const outcome = input.desired_outcome || "make a real decision today";
  return {
    intro: `Set context in one line: this video is for ${who} who want to ${outcome.toLowerCase()}. Promise the payoff in the first 5 seconds.`,
    problem: `Name the specific pain ${who} feels with ${topic}. Use one concrete example — not generalities.`,
    insight: `Share the one non-obvious idea that reframes ${topic}. The viewer should feel "I hadn't thought of it that way".`,
    proof: `Show a specific example, number, or before/after that proves the insight is real (not theory).`,
    solution: `Walk through the 3-step move ${who} can apply this week to ${outcome.toLowerCase()}.`,
    cta: buildCta(input),
  };
}

function buildCta(input: VideoForgeInput): string {
  const topic = input.topic || "this";
  switch (input.video_goal) {
    case "sales":
      return `Tap the link in the description to start with ${topic} this week.`;
    case "product_demo":
      return `Try it free — link below. DM "${topic}" if you want a 5-min walkthrough.`;
    case "marketing":
      return `Follow for more on ${topic}. DM "${topic}" for the playbook.`;
    case "education":
    case "tutorial":
      return `Save this so you can apply ${topic} the next time you need it.`;
    case "thought_leadership":
      return `If this challenged you, share it with one ${input.target_audience || "peer"} who needs to think this through.`;
    case "entertainment":
    default:
      return `Like + follow if you want more like this on ${topic}.`;
  }
}

function buildSceneBreakdown(
  input: VideoForgeInput,
  sections: ScriptSections,
): SceneBreakdownItem[] {
  const isVertical =
    input.platform === "tiktok" || input.platform === "instagram" || input.format === "short_form";
  const topic = input.topic || "the topic";
  const audience = input.target_audience || "viewer";

  const blueprint: Array<{
    purpose: string;
    narrationKey: keyof ScriptSections;
    visual: string;
    bRoll: string;
    text: string;
  }> = [
    {
      purpose: "Hook",
      narrationKey: "intro",
      visual: isVertical
        ? "Tight close-up of speaker, eye-line at lens, motion in frame 1."
        : "Wide opener with movement; cut to medium close-up by 0:03.",
      bRoll: `${topic} concept ${isVertical ? "vertical" : "horizontal"}`,
      text: `${topic.toUpperCase()}`.slice(0, 28),
    },
    {
      purpose: "Problem",
      narrationKey: "problem",
      visual: "Show the pain: a screenshot, a metric going the wrong way, or a re-enactment beat.",
      bRoll: `${audience} struggling with ${topic}`,
      text: "The problem",
    },
    {
      purpose: "Insight",
      narrationKey: "insight",
      visual: "Diagram or animated text reveal of the reframe — one idea, large, centered.",
      bRoll: `${topic} reframe diagram`,
      text: "The reframe",
    },
    {
      purpose: "Proof",
      narrationKey: "proof",
      visual: "Show the artifact: dashboard, before/after, customer quote on screen.",
      bRoll: `${topic} results dashboard`,
      text: "Proof, not theory",
    },
    {
      purpose: "Solution",
      narrationKey: "solution",
      visual: "3 numbered cards animate in. Speaker delivers each step to camera.",
      bRoll: `step-by-step ${topic}`,
      text: "3 steps",
    },
    {
      purpose: "Story beat",
      narrationKey: "insight",
      visual: "B-roll of the relevant environment — desk, tools, real workflow.",
      bRoll: `${audience} workspace ${topic}`,
      text: "",
    },
    {
      purpose: "Objection handle",
      narrationKey: "proof",
      visual: "Speaker addresses the camera directly; lower-third with the objection text.",
      bRoll: `objection ${topic}`,
      text: '"But what about…"',
    },
    {
      purpose: "Recap",
      narrationKey: "solution",
      visual: "Animated recap card showing the 3-step framework one more time.",
      bRoll: `${topic} recap`,
      text: "Recap",
    },
    {
      purpose: "CTA",
      narrationKey: "cta",
      visual: "Speaker direct to camera + on-screen end card with action.",
      bRoll: `cta ${topic}`,
      text: "Your move →",
    },
  ];

  const scenes = blueprint.slice(0, SCENE_COUNT_BY_LENGTH[input.target_length]);

  return scenes.map((s, i) => ({
    scene_number: i + 1,
    scene_purpose: s.purpose,
    narration: sections[s.narrationKey],
    suggested_visual: s.visual,
    b_roll_or_stock_query: s.bRoll,
    on_screen_text: s.text,
  }));
}

function buildCaptions(
  input: VideoForgeInput,
  output: Pick<VideoForgeOutput, "video_title" | "opening_hook" | "script_sections" | "hashtags">,
): { short_caption: string; long_caption: string } {
  const tagLine = output.hashtags.slice(0, 5).join(" ");
  const short = `${output.opening_hook}\n\n${output.script_sections.cta}\n\n${tagLine}`;
  const long = [
    output.video_title,
    "",
    output.opening_hook,
    "",
    `For: ${input.target_audience || "anyone shipping work"}`,
    `Goal: ${GOAL_LABELS[input.video_goal]}`,
    "",
    "What you'll learn:",
    `1. ${output.script_sections.problem}`,
    `2. ${output.script_sections.insight}`,
    `3. ${output.script_sections.solution}`,
    "",
    output.script_sections.cta,
    "",
    tagLine,
  ].join("\n");
  return { short_caption: short, long_caption: long };
}

function buildThumbnailConcepts(input: VideoForgeInput): string[] {
  const topic = input.topic || "the topic";
  return [
    `Bold 3-word phrase ("${topic.toUpperCase().split(" ").slice(0, 3).join(" ")}") with arrow pointing at a circled object — face on right.`,
    `Before/after split: left = "before ${topic}" (red), right = "after ${topic}" (green). High contrast, no clutter.`,
    `Reaction face + a single number on screen ("3X" / "$0 → $X") tied to the proof from the script.`,
  ];
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
  const audienceTag = slug(input.target_audience) || "founders";
  const goalTag = `${input.video_goal.replace(/_/g, "")}video`;
  const platformTag = input.platform;
  return Array.from(
    new Set([
      `#${topicTag}`,
      `#${audienceTag}`,
      `#${goalTag}`,
      `#${platformTag}`,
      "#ethinx",
      "#videoforge",
    ]),
  );
}

function buildDistribution(input: VideoForgeInput): string {
  const native = PLATFORM_LABELS[input.platform];
  return `Native upload to ${native} in the format that platform rewards (${
    input.format === "long_form" ? "horizontal long-form" : input.format === "short_form" ? "vertical short-form" : FORMAT_LABELS[input.format]
  }). Burn captions in. Cut a 7s teaser for the next-best platform after 48h. Link in pinned comment / bio — never first comment.`;
}

function buildSuccessMetric(input: VideoForgeInput): string {
  const outcome = input.desired_outcome || "the desired outcome";
  switch (input.target_length) {
    case "short":
      return `3-second view rate ≥ 65%. If hit, repeat the angle. If missed, rewrite the hook only — keep the rest. Tie back to: "${outcome}".`;
    case "long":
      return `Average view duration ≥ 45% of total length, retention curve flat after the first 30s. Tie back to: "${outcome}".`;
    case "medium":
    default:
      return `Watch-time ≥ 30s and CTA click-through ≥ 2.5%. Tie back to: "${outcome}".`;
  }
}

function buildTitle(input: VideoForgeInput): string {
  const topic = input.topic.trim() || "your next video";
  switch (input.video_goal) {
    case "sales":
      return `${topic} — the offer breakdown`;
    case "education":
    case "tutorial":
      return `${topic}, explained`;
    case "marketing":
      return `${topic}: what most people get wrong`;
    case "thought_leadership":
      return `Why ${topic} is about to change`;
    case "product_demo":
      return `${topic} in 60 seconds (live demo)`;
    case "entertainment":
      return `${topic} — you weren't ready`;
    default:
      return `${topic} in 60 seconds`;
  }
}

function buildCoreAngle(input: VideoForgeInput): string {
  return `Treat ${input.topic || "the topic"} as a ${GOAL_LABELS[input.video_goal].toLowerCase()} problem for ${input.target_audience || "the viewer"}, not a content topic. The angle is: skip the theory, show the move.`;
}

function buildViewerPromise(input: VideoForgeInput): string {
  const outcome = input.desired_outcome || "make one better decision today";
  return `By the end of this video, ${input.target_audience || "you"} will be able to ${outcome.toLowerCase()} — without watching anything else on ${input.topic || "the topic"}.`;
}

export function generateVideoForge(input: VideoForgeInput): VideoForgeOutput {
  const video_title = buildTitle(input);
  const core_angle = buildCoreAngle(input);
  const viewer_promise = buildViewerPromise(input);
  const opening_hook = buildHook(input);
  const script_sections = buildScriptSections(input);
  const scene_breakdown = buildSceneBreakdown(input, script_sections);
  const hashtags = buildHashtags(input);
  const captions = buildCaptions(input, {
    video_title,
    opening_hook,
    script_sections,
    hashtags,
  });
  const thumbnail_concepts = buildThumbnailConcepts(input);
  const distribution_recommendation = buildDistribution(input);
  const success_metric = buildSuccessMetric(input);

  return {
    video_title,
    core_angle,
    viewer_promise,
    opening_hook,
    script_sections,
    scene_breakdown,
    captions,
    thumbnail_concepts,
    hashtags,
    distribution_recommendation,
    success_metric,
  };
}

export function formatVideoForge(input: VideoForgeInput, out: VideoForgeOutput): string {
  return [
    `TITLE: ${out.video_title}`,
    `GOAL: ${GOAL_LABELS[input.video_goal]} · PLATFORM: ${PLATFORM_LABELS[input.platform]} · FORMAT: ${FORMAT_LABELS[input.format]}`,
    `TONE: ${TONE_LABELS[input.tone]} · LENGTH: ${LENGTH_LABELS[input.target_length]}`,
    "",
    `CORE ANGLE: ${out.core_angle}`,
    "",
    `VIEWER PROMISE: ${out.viewer_promise}`,
    "",
    "OPENING HOOK",
    out.opening_hook,
    "",
    "SCRIPT SECTIONS",
    `Intro:    ${out.script_sections.intro}`,
    `Problem:  ${out.script_sections.problem}`,
    `Insight:  ${out.script_sections.insight}`,
    `Proof:    ${out.script_sections.proof}`,
    `Solution: ${out.script_sections.solution}`,
    `CTA:      ${out.script_sections.cta}`,
    "",
    "SCENE BREAKDOWN",
    ...out.scene_breakdown.flatMap((s) => [
      `--- Scene ${s.scene_number} · ${s.scene_purpose} ---`,
      `Narration: ${s.narration}`,
      `Visual:    ${s.suggested_visual}`,
      `B-roll:    ${s.b_roll_or_stock_query}`,
      `On-screen: ${s.on_screen_text || "—"}`,
      "",
    ]),
    "CAPTIONS",
    `Short:`,
    out.captions.short_caption,
    ``,
    `Long:`,
    out.captions.long_caption,
    "",
    "THUMBNAIL CONCEPTS",
    ...out.thumbnail_concepts.map((t, i) => `${i + 1}. ${t}`),
    "",
    `HASHTAGS: ${out.hashtags.join(" ")}`,
    formatFooter({
      nextSteps: [
        `Read the opening hook out loud — if it doesn't earn the next 5 seconds, rewrite it before recording.`,
        `Record one take of the hook + first scene only. Review before continuing.`,
        `Burn captions into the final cut; do not rely on auto-captions.`,
        `Schedule the post via Distribution before the day is over.`,
      ],
      distribution: out.distribution_recommendation,
      successMetric: out.success_metric,
    }),
  ].join("\n");
}
