// Creator Launchpad — turns project idea + timeframe + outcome
// into a milestone-based launch roadmap.

export type LaunchTimeframe = "1-week" | "2-weeks" | "30-days" | "60-days";

export const TIMEFRAME_LABELS: Record<LaunchTimeframe, string> = {
  "1-week": "1 week (sprint launch)",
  "2-weeks": "2 weeks (standard launch)",
  "30-days": "30 days (warm-up + launch)",
  "60-days": "60 days (full campaign)",
};

const TIMEFRAME_DAYS: Record<LaunchTimeframe, number> = {
  "1-week": 7,
  "2-weeks": 14,
  "30-days": 30,
  "60-days": 60,
};

export interface LaunchpadInput {
  projectIdea: string;
  timeframe: LaunchTimeframe;
  outcome: string;
}

export interface LaunchMilestone {
  day: number;
  phase: "pre-launch" | "launch" | "post-launch";
  title: string;
  detail: string;
}

interface LaunchPlan {
  milestones: LaunchMilestone[];
  successMetric: string;
  riskFlags: string[];
}

const PHASE_SPLITS: Record<LaunchTimeframe, [number, number]> = {
  // [pre-launch %, launch %] — rest is post-launch
  "1-week": [0.4, 0.4],
  "2-weeks": [0.5, 0.3],
  "30-days": [0.5, 0.3],
  "60-days": [0.55, 0.3],
};

function dayPick(total: number, fraction: number) {
  return Math.max(1, Math.round(total * fraction));
}

export function generateLaunchPlan(input: LaunchpadInput): LaunchPlan {
  const total = TIMEFRAME_DAYS[input.timeframe];
  const [preFrac, launchFrac] = PHASE_SPLITS[input.timeframe];
  const preEnd = dayPick(total, preFrac);
  const launchEnd = Math.min(total, preEnd + dayPick(total, launchFrac));

  const idea = input.projectIdea || "your project";
  const outcome = input.outcome || "your launch outcome";

  const milestones: LaunchMilestone[] = [
    {
      day: 1,
      phase: "pre-launch",
      title: "Lock the promise",
      detail: `Write one sentence that commits to "${outcome}" via "${idea}". This becomes the spine of every post.`,
    },
    {
      day: Math.max(2, Math.round(preEnd * 0.3)),
      phase: "pre-launch",
      title: "Tease the problem",
      detail: `Publish 2 posts naming the pain "${idea}" solves — without revealing the offer.`,
    },
    {
      day: Math.max(3, Math.round(preEnd * 0.6)),
      phase: "pre-launch",
      title: "Open the waitlist",
      detail: `Stand up a one-page waitlist tied to ${outcome}. Drive every reply / DM there.`,
    },
    {
      day: preEnd,
      phase: "pre-launch",
      title: "Pre-launch proof",
      detail: `Share one piece of social proof or behind-the-scenes that makes ${idea} feel inevitable.`,
    },
    {
      day: preEnd + 1,
      phase: "launch",
      title: "Launch announcement",
      detail: `Publish the launch post on every owned channel. Pin it. Email the waitlist within 1 hour.`,
    },
    {
      day: Math.round((preEnd + launchEnd) / 2),
      phase: "launch",
      title: "Objection volley",
      detail: `Address the 3 most common objections to ${idea} in 3 separate posts.`,
    },
    {
      day: launchEnd - 1,
      phase: "launch",
      title: "Urgency window",
      detail: `Announce a real deadline or bonus that closes at ${launchEnd}. Post a countdown daily.`,
    },
    {
      day: launchEnd,
      phase: "launch",
      title: "Close the window",
      detail: `Last-call post + email. Move undecided leads to a follow-up sequence.`,
    },
    {
      day: Math.min(total, launchEnd + 2),
      phase: "post-launch",
      title: "Public recap",
      detail: `Share the numbers (good or bad). This builds trust for the next launch and retains attention.`,
    },
    {
      day: total,
      phase: "post-launch",
      title: "Next-step offer",
      detail: `Give non-buyers a smaller, lower-friction next step tied to ${outcome}.`,
    },
  ];

  return {
    milestones: milestones
      .filter((m) => m.day <= total)
      .sort((a, b) => a.day - b.day),
    successMetric: `% of waitlist that converts in the launch window — target ≥ 8%. Anchor decisions to "${outcome}".`,
    riskFlags: [
      "No waitlist before launch day → expect <2% conversion.",
      "Single-channel launch → halve your forecast.",
      "No deadline / urgency → tail dies in 48h.",
    ],
  };
}

export function formatLaunchPlan(input: LaunchpadInput, plan: LaunchPlan): string {
  const phaseLabel = (p: LaunchMilestone["phase"]) =>
    p === "pre-launch" ? "PRE" : p === "launch" ? "LAUNCH" : "POST";
  return [
    `PROJECT: ${input.projectIdea}`,
    `TIMEFRAME: ${TIMEFRAME_LABELS[input.timeframe]}`,
    `TARGET OUTCOME: ${input.outcome}`,
    "",
    "MILESTONES",
    ...plan.milestones.map(
      (m) => `Day ${m.day} · [${phaseLabel(m.phase)}] ${m.title} — ${m.detail}`,
    ),
    "",
    `SUCCESS METRIC: ${plan.successMetric}`,
    "",
    "RISK FLAGS",
    ...plan.riskFlags.map((r, i) => `${i + 1}. ${r}`),
  ].join("\n");
}
