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

interface AngleSpec {
  kind: string;
  hookPrefix: string;
  title: (t: string) => string;
  hook: (t: string) => string;
  beat1: (t: string) => string;
  beat2: (t: string) => string;
}

const ANGLES: AngleSpec[] = [
  {
    kind: "Mistake",
    hookPrefix: "Stop.",
    title: (t) => `The #1 mistake people make about ${t}`,
    hook: (t) => `Stop. If you're trying ${t}, you're probably doing this wrong.`,
    beat1: (t) => `Name the mistake explicitly: most people approach ${t} by [generic move]. It feels productive but moves zero metrics.`,
    beat2: (t) => `Show what works instead in one sentence — and back it with one number you can prove.`,
  },
  {
    kind: "Contrarian",
    hookPrefix: "Hot take:",
    title: (t) => `Why the common advice on ${t} is wrong`,
    hook: (t) => `Hot take: the popular advice on ${t} is built for a different game than yours.`,
    beat1: (t) => `Quote the common advice on ${t} verbatim. Then explain why the conditions it assumes don't apply to your audience.`,
    beat2: (t) => `Offer the contrarian rule. State the trade-off honestly — when it doesn't work.`,
  },
  {
    kind: "Framework",
    hookPrefix: "Quick framework:",
    title: (t) => `A 3-step way to do ${t}`,
    hook: (t) => `Here's the 3-step way I run ${t} — copy it.`,
    beat1: (t) => `Walk through steps 1–2 with one concrete artifact each (a line, a metric, a screenshot of ${t}).`,
    beat2: (t) => `Step 3 + the failure mode at each step. End with the artifact a viewer should produce by tonight.`,
  },
  {
    kind: "Case study",
    hookPrefix: "Real example:",
    title: (t) => `How [name] used ${t} to [result]`,
    hook: (t) => `Real example: someone I know used ${t} to get a result most people don't believe.`,
    beat1: (t) => `Set the scene: who, what they tried before, why it failed. Specific numbers > adjectives.`,
    beat2: (t) => `What they changed about ${t} + the outcome with a date. Lesson the viewer can steal.`,
  },
  {
    kind: "Myth-bust",
    hookPrefix: "Myth:",
    title: (t) => `The biggest myth about ${t}`,
    hook: (t) => `The biggest lie about ${t} is the one nobody questions.`,
    beat1: (t) => `State the myth in 1 line. Show where it came from (who benefits from people believing it about ${t}?).`,
    beat2: (t) => `Replace it with the reality + one tactic that proves the new framing.`,
  },
  {
    kind: "Shortcut",
    hookPrefix: "Save 10 minutes:",
    title: (t) => `One template that makes ${t} faster`,
    hook: (t) => `Steal this template — it cuts ${t} time in half.`,
    beat1: (t) => `Show the template on screen (text overlay). Walk through what each field does.`,
    beat2: (t) => `Demo: fill it in live with a realistic ${t} example. Tell viewers where to grab it.`,
  },
  {
    kind: "Recap",
    hookPrefix: "Best of the week:",
    title: (t) => `3 things I learned about ${t} this week`,
    hook: (t) => `3 lessons from this week on ${t} — distilled.`,
    beat1: (t) => `Lessons 1 & 2 with the source / context that produced each insight on ${t}.`,
    beat2: (t) => `Lesson 3 + the one thing you're changing about ${t} next week.`,
  },
  {
    kind: "Behind-the-scenes",
    hookPrefix: "Inside look:",
    title: (t) => `How I actually run ${t} day-to-day`,
    hook: (t) => `What ${t} looks like behind the scenes — not the polished version.`,
    beat1: (t) => `Show the messy artifact: the doc, the dashboard, the inbox you actually use for ${t}.`,
    beat2: (t) => `One unglamorous habit that makes the whole system work. End on the trade-off you accept.`,
  },
  {
    kind: "Q&A",
    hookPrefix: "Most-asked Q:",
    title: (t) => `The question I get most about ${t}`,
    hook: (t) => `The single question I get most about ${t} — answered straight.`,
    beat1: (t) => `Read the question verbatim. Reframe it: what they're really asking about ${t} is ____.`,
    beat2: (t) => `Direct answer with one example. Invite a follow-up question in the comments.`,
  },
  {
    kind: "Prediction",
    hookPrefix: "Next 12 months:",
    title: (t) => `Where ${t} is going in the next 12 months`,
    hook: (t) => `Where ${t} goes next — and what to do today to be ready.`,
    beat1: (t) => `One trend on ${t} you can show evidence for (data, anecdote, signal).`,
    beat2: (t) => `Concrete action a viewer can take this week to position for that future.`,
  },
  {
    kind: "Compare",
    hookPrefix: "Old vs new:",
    title: (t) => `Old way vs new way of doing ${t}`,
    hook: (t) => `Old ${t} vs new ${t} — same goal, very different work.`,
    beat1: (t) => `Show the old way of ${t} on screen. Be fair about what it got right.`,
    beat2: (t) => `Show the new way + the specific situation where each one still wins.`,
  },
  {
    kind: "Anti-pattern",
    hookPrefix: "Stop doing:",
    title: (t) => `3 things to STOP doing in ${t}`,
    hook: (t) => `If you're doing ${t}, stop these 3 things first.`,
    beat1: (t) => `Anti-patterns 1 & 2 in ${t}, with why each one feels right but fails.`,
    beat2: (t) => `Anti-pattern 3 + the replacement habit. Make the swap concrete.`,
  },
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
    workingTitle: a.title(topic),
    hook: a.hook(topic),
    beat1: a.beat1(topic),
    beat2: a.beat2(topic),
    cta: i === count - 1
      ? `Follow for the full ${topic} series — DM "${topic}" for the playbook.`
      : `Save this. Tomorrow: ${selected[i + 1]?.kind ?? "next angle"}.`,
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
    formatFooter({
      nextSteps: [
        `Block 90 minutes on the calendar for the shoot — same outfit, same background.`,
        `Pre-write the on-screen text overlay for each video (≤ 5 words each).`,
        `Set up the camera and shoot all ${plan.videos.length} in one session, in roll order.`,
        `Edit + caption #1 immediately; queue the rest at one per day.`,
      ],
      distribution: `Native upload to ${VELOCITY_PLATFORM_LABELS[input.platform]} at the same time slot daily. Cross-post the Mistake angle (#1) to a second platform after 48h to test transfer.`,
      successMetric: `Median 3-second view rate ≥ 65% across the batch. Watch the angle that wins — that's next batch's spine.`,
    }),
  ].join("\n");
}
