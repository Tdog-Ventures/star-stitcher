// Video Velocity — turns one topic into a repeatable batch production plan.
import { formatFooter } from "./output-footer";

export type VelocityPlatform = "tiktok" | "reels" | "shorts" | "linkedin" | "x";

export type PublishingFrequency = "daily" | "every-other-day" | "3x-week" | "weekly";

export type ContentGoal =
  | "growth"
  | "authority"
  | "leads"
  | "sales";

export const VELOCITY_PLATFORM_LABELS: Record<VelocityPlatform, string> = {
  tiktok: "TikTok",
  reels: "Instagram Reels",
  shorts: "YouTube Shorts",
  linkedin: "LinkedIn video",
  x: "X video",
};

export const FREQUENCY_LABELS: Record<PublishingFrequency, string> = {
  daily: "Daily",
  "every-other-day": "Every other day",
  "3x-week": "3x / week",
  weekly: "Weekly",
};

export const CONTENT_GOAL_LABELS: Record<ContentGoal, string> = {
  growth: "Audience growth",
  authority: "Authority / trust",
  leads: "Lead capture",
  sales: "Direct sales",
};

const PLATFORM_HOOK_RULE: Record<VelocityPlatform, string> = {
  tiktok: "Visual hook in frame 1. No intro card.",
  reels: "Pattern-interrupt motion + bold text in first second.",
  shorts: "Spoken hook + visual change within 2s.",
  linkedin: "Stand-alone first line — must read as a thumb-stop in feed.",
  x: "First 4s must work without sound (autoplay muted).",
};

const PLATFORM_LENGTH: Record<VelocityPlatform, string> = {
  tiktok: "20–35s, vertical 9:16",
  reels: "15–30s, vertical 9:16",
  shorts: "30–45s, vertical 9:16",
  linkedin: "60–90s, square 1:1 or 9:16",
  x: "30–60s, 16:9 or 9:16",
};

interface AngleSpec {
  kind: string;
  title: (t: string) => string;
  hook: (t: string) => string;
  scriptSummary: (t: string) => string;
  visual: string;
  cta: (t: string, isLast: boolean, nextKind?: string) => string;
}

const ANGLES: AngleSpec[] = [
  {
    kind: "Mistake",
    title: (t) => `The #1 mistake people make about ${t}`,
    hook: (t) => `Stop. If you're trying ${t}, you're probably doing this wrong.`,
    scriptSummary: (t) => `Name the mistake about ${t} explicitly, show why it feels productive but moves nothing, then deliver the replacement move with a number you can prove.`,
    visual: "Tight close-up + on-screen X over a screenshot of the bad approach.",
    cta: (t, isLast, next) => isLast ? `Follow for the full ${t} series.` : `Save this. Tomorrow: ${next}.`,
  },
  {
    kind: "Contrarian",
    title: (t) => `Why the common advice on ${t} is wrong`,
    hook: (t) => `Hot take: the popular advice on ${t} is built for a different game than yours.`,
    scriptSummary: (t) => `Quote the common advice on ${t} verbatim, explain the assumption it relies on that doesn't apply, then give the contrarian rule + the trade-off.`,
    visual: "Split-screen: 'common advice' left, 'real rule' right.",
    cta: (t, isLast, next) => isLast ? `DM "${t}" for the playbook.` : `Save. Tomorrow: ${next}.`,
  },
  {
    kind: "Framework",
    title: (t) => `A 3-step way to do ${t}`,
    hook: (t) => `Here's the 3-step way I run ${t} — copy it.`,
    scriptSummary: (t) => `Walk through 3 steps for ${t}, each with one concrete artifact (a line, a metric, a screenshot). End on the artifact the viewer should produce by tonight.`,
    visual: "3 numbered cards animate in over speaker eye-line shot.",
    cta: (t, isLast, next) => isLast ? `Comment "framework" for the doc.` : `Save. Tomorrow: ${next}.`,
  },
  {
    kind: "Case study",
    title: (t) => `How [name] used ${t} to [result]`,
    hook: (t) => `Real example: someone I know used ${t} to get a result most people don't believe.`,
    scriptSummary: (t) => `Set the scene (who / what they tried before / why it failed), what they changed about ${t}, and the outcome with a date. Lesson the viewer can steal.`,
    visual: "Before/after dashboard or document on screen with subject reaction.",
    cta: (t, isLast, next) => isLast ? `Reply with your before-state — I'll suggest the next move.` : `Save. Tomorrow: ${next}.`,
  },
  {
    kind: "Myth-bust",
    title: (t) => `The biggest myth about ${t}`,
    hook: (t) => `The biggest lie about ${t} is the one nobody questions.`,
    scriptSummary: (t) => `State the myth on ${t} in one line, show who benefits from it being believed, then replace with reality + one tactic that proves the new framing.`,
    visual: "Lower-third with the myth text crossed out, replaced with reality.",
    cta: (t, isLast, next) => isLast ? `Share with one person stuck on the old myth.` : `Save. Tomorrow: ${next}.`,
  },
  {
    kind: "Shortcut",
    title: (t) => `One template that makes ${t} faster`,
    hook: (t) => `Steal this template — it cuts ${t} time in half.`,
    scriptSummary: (t) => `Show the template on screen, walk through what each field does, demo it live with a realistic ${t} example, then tell viewers where to grab it.`,
    visual: "Screen recording of the template being filled out in real time.",
    cta: (t, isLast, next) => isLast ? `Comment "template" — I'll DM the link.` : `Save. Tomorrow: ${next}.`,
  },
  {
    kind: "Recap",
    title: (t) => `3 things I learned about ${t} this week`,
    hook: (t) => `3 lessons from this week on ${t} — distilled.`,
    scriptSummary: (t) => `Lessons 1 & 2 on ${t} with the source / context that produced each insight. Lesson 3 + the one thing you're changing about ${t} next week.`,
    visual: "Three numbered text overlays + speaker direct to camera.",
    cta: (t, isLast, next) => isLast ? `Follow for next week's recap.` : `Save. Tomorrow: ${next}.`,
  },
  {
    kind: "Behind-the-scenes",
    title: (t) => `How I actually run ${t} day-to-day`,
    hook: (t) => `What ${t} looks like behind the scenes — not the polished version.`,
    scriptSummary: (t) => `Show the messy artifact (doc / dashboard / inbox) you actually use for ${t}. Reveal one unglamorous habit that makes the system work + the trade-off you accept.`,
    visual: "Phone-quality screen capture of real workspace, no polish.",
    cta: (t, isLast, next) => isLast ? `Reply: which part do you want a deeper look at?` : `Save. Tomorrow: ${next}.`,
  },
  {
    kind: "Q&A",
    title: (t) => `The question I get most about ${t}`,
    hook: (t) => `The single question I get most about ${t} — answered straight.`,
    scriptSummary: (t) => `Read the question verbatim, reframe what they're really asking about ${t}, give a direct answer with one example, and invite a follow-up question.`,
    visual: "Question text on screen above eye-line.",
    cta: (t, isLast, next) => isLast ? `Drop your question in the comments.` : `Save. Tomorrow: ${next}.`,
  },
  {
    kind: "Prediction",
    title: (t) => `Where ${t} is going in the next 12 months`,
    hook: (t) => `Where ${t} goes next — and what to do today to be ready.`,
    scriptSummary: (t) => `One trend on ${t} you can show evidence for (data / signal), then one concrete action a viewer can take this week to position for that future.`,
    visual: "Simple animated chart or trend graphic.",
    cta: (t, isLast, next) => isLast ? `Follow if you want the next one.` : `Save. Tomorrow: ${next}.`,
  },
  {
    kind: "Compare",
    title: (t) => `Old vs new way of doing ${t}`,
    hook: (t) => `Old ${t} vs new ${t} — same goal, very different work.`,
    scriptSummary: (t) => `Show the old way of ${t} fairly. Then show the new way + the specific situation where each one still wins.`,
    visual: "Side-by-side split screen, old left, new right.",
    cta: (t, isLast, next) => isLast ? `Which side are you on? Reply.` : `Save. Tomorrow: ${next}.`,
  },
  {
    kind: "Anti-pattern",
    title: (t) => `3 things to STOP doing in ${t}`,
    hook: (t) => `If you're doing ${t}, stop these 3 things first.`,
    scriptSummary: (t) => `Anti-patterns 1 & 2 in ${t} with why each feels right but fails. Anti-pattern 3 + the replacement habit. Make the swap concrete.`,
    visual: "Red X over each anti-pattern, green check on the replacement.",
    cta: (t, isLast, next) => isLast ? `Reply with the one you're stopping today.` : `Save. Tomorrow: ${next}.`,
  },
];

export interface VideoVelocityInput {
  batch_topic: string;
  number_of_videos: string;
  platform: VelocityPlatform;
  audience: string;
  publishing_frequency: PublishingFrequency;
  content_goal: ContentGoal;
  source_material: string;
}

export interface VelocityVideo {
  video_number: number;
  title: string;
  hook: string;
  angle: string;
  script_summary: string;
  visual_direction: string;
  cta: string;
}

export interface VideoVelocityOutput {
  batch_strategy: string;
  video_batch_table: VelocityVideo[];
  repurposing_plan: string[];
  posting_schedule: { video_number: number; day: string; window: string }[];
  production_checklist: string[];
  bottlenecks: string[];
  distribution_recommendation: string;
  success_metric: string;
}

const DAY_GAP: Record<PublishingFrequency, number> = {
  daily: 1,
  "every-other-day": 2,
  "3x-week": 2.33,
  weekly: 7,
};

function nthDay(n: number, gap: number): string {
  const day = Math.round(n * gap);
  return `Day ${day}`;
}

export function generateVideoVelocity(input: VideoVelocityInput): VideoVelocityOutput {
  const topic = input.batch_topic || "your topic";
  const audience = input.audience || "your audience";
  const count = Math.min(Math.max(parseInt(input.number_of_videos, 10) || 5, 1), ANGLES.length);
  const selected = ANGLES.slice(0, count);

  const videos: VelocityVideo[] = selected.map((a, i) => ({
    video_number: i + 1,
    title: a.title(topic),
    hook: a.hook(topic),
    angle: a.kind,
    script_summary: a.scriptSummary(topic),
    visual_direction: a.visual,
    cta: a.cta(topic, i === count - 1, selected[i + 1]?.kind),
  }));

  const gap = DAY_GAP[input.publishing_frequency];
  const posting_schedule = videos.map((v) => ({
    video_number: v.video_number,
    day: nthDay(v.video_number - 1, gap),
    window: input.platform === "linkedin" ? "07:30–09:30 local" : "18:00–21:00 local",
  }));

  return {
    batch_strategy: `One topic ("${topic}") → ${count} angles in one shoot, published ${FREQUENCY_LABELS[input.publishing_frequency].toLowerCase()} on ${VELOCITY_PLATFORM_LABELS[input.platform]} for ${audience}. Optimised for ${CONTENT_GOAL_LABELS[input.content_goal].toLowerCase()}. ${PLATFORM_HOOK_RULE[input.platform]}`,
    video_batch_table: videos,
    repurposing_plan: [
      `Cut a 7-second teaser of the Mistake angle → cross-post 48h after the original.`,
      `Stitch the top-3 hooks into a sizzle reel for paid ads or pinned post.`,
      `Transcribe each video into a long-form thread / newsletter section.`,
      input.source_material ? `Pull 1 quote from "${input.source_material}" per video as a still graphic.` : `Pull one screenshot per video as a standalone still graphic.`,
    ],
    posting_schedule,
    production_checklist: [
      `Single static camera, eye-line at lens, ring light + one rim.`,
      `Same outfit + same background for entire batch (continuity = thumb-stop consistency).`,
      `Pre-write the on-screen text overlay for each video (≤ 5 words each).`,
      `Roll order: Mistake → Framework → hardest angle → Q&A / Recap last.`,
      `Estimated camera time: ≈ ${count * 12} min + 30 min reset.`,
      `Edit + caption #1 immediately; queue the rest at one per ${FREQUENCY_LABELS[input.publishing_frequency].toLowerCase()} interval.`,
    ],
    bottlenecks: [
      `Editing is the bottleneck, not shooting. Pre-build a single template (intro card, captions, end card).`,
      `If hook performance varies > 3x across the batch, the angle ordering is wrong — re-rank by past data.`,
      `Cross-platform posting kills algorithmic momentum on ${VELOCITY_PLATFORM_LABELS[input.platform]} — wait 48h.`,
    ],
    distribution_recommendation: `Native upload to ${VELOCITY_PLATFORM_LABELS[input.platform]} at the same time slot per ${FREQUENCY_LABELS[input.publishing_frequency].toLowerCase()} interval (${PLATFORM_LENGTH[input.platform]}). Cross-post the Mistake angle (#1) to a second platform after 48h to test transfer.`,
    success_metric: `Median 3-second view rate ≥ 65% across the batch. Watch the angle that wins — that's next batch's spine. Tie back to: "${CONTENT_GOAL_LABELS[input.content_goal]}".`,
  };
}

export function formatVideoVelocity(input: VideoVelocityInput, plan: VideoVelocityOutput): string {
  return [
    `BATCH TOPIC: ${input.batch_topic}`,
    `PLATFORM: ${VELOCITY_PLATFORM_LABELS[input.platform]} (${PLATFORM_LENGTH[input.platform]}) · FREQUENCY: ${FREQUENCY_LABELS[input.publishing_frequency]}`,
    `AUDIENCE: ${input.audience} · GOAL: ${CONTENT_GOAL_LABELS[input.content_goal]}`,
    `SOURCE MATERIAL: ${input.source_material || "—"}`,
    `VIDEO COUNT: ${plan.video_batch_table.length}`,
    "",
    "BATCH STRATEGY",
    plan.batch_strategy,
    "",
    "VIDEOS",
    ...plan.video_batch_table.flatMap((v) => [
      `--- #${v.video_number} · ${v.angle} ---`,
      `Title:   ${v.title}`,
      `Hook:    ${v.hook}`,
      `Script:  ${v.script_summary}`,
      `Visual:  ${v.visual_direction}`,
      `CTA:     ${v.cta}`,
      "",
    ]),
    "POSTING SCHEDULE",
    ...plan.posting_schedule.map((p) => `- #${p.video_number} → ${p.day} (${p.window})`),
    "",
    "PRODUCTION CHECKLIST",
    ...plan.production_checklist.map((p, i) => `${i + 1}. ${p}`),
    "",
    "REPURPOSING PLAN",
    ...plan.repurposing_plan.map((r, i) => `${i + 1}. ${r}`),
    "",
    "BOTTLENECKS",
    ...plan.bottlenecks.map((b, i) => `${i + 1}. ${b}`),
    formatFooter({
      nextSteps: [
        `Block 90 minutes on the calendar for the shoot — same outfit, same background.`,
        `Pre-write the on-screen text overlay for each video (≤ 5 words each).`,
        `Set up the camera and shoot all ${plan.video_batch_table.length} in one session, in roll order.`,
        `Edit + caption #1 immediately; queue the rest on the schedule above.`,
      ],
      distribution: plan.distribution_recommendation,
      successMetric: plan.success_metric,
    }),
  ].join("\n");
}
