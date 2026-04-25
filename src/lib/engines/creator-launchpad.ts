// Creator OS Launchpad — converts a project idea into an execution roadmap.
import { formatFooter } from "./output-footer";

export type LaunchTimeframe = "1-week" | "2-weeks" | "30-days" | "60-days";
export type LaunchStage = "idea" | "building" | "ready-to-launch" | "post-launch";

export const TIMEFRAME_LABELS: Record<LaunchTimeframe, string> = {
  "1-week": "1 week (sprint launch)",
  "2-weeks": "2 weeks (standard launch)",
  "30-days": "30 days (warm-up + launch)",
  "60-days": "60 days (full campaign)",
};

export const STAGE_LABELS: Record<LaunchStage, string> = {
  idea: "Idea",
  building: "Building",
  "ready-to-launch": "Ready to launch",
  "post-launch": "Post-launch / iterate",
};

const TIMEFRAME_DAYS: Record<LaunchTimeframe, number> = {
  "1-week": 7,
  "2-weeks": 14,
  "30-days": 30,
  "60-days": 60,
};

export interface CreatorLaunchpadInput {
  project_name: string;
  project_goal: string;
  launch_timeframe: LaunchTimeframe;
  target_outcome: string;
  available_time_per_week: string;
  current_stage: LaunchStage;
  constraints: string;
}

export interface MilestoneItem {
  day: number;
  phase: "pre-launch" | "launch" | "post-launch";
  title: string;
  detail: string;
}

export interface WeeklyPlanItem {
  week: number;
  focus: string;
  tasks: string[];
}

export interface CreatorLaunchpadOutput {
  launch_summary: string;
  milestone_map: MilestoneItem[];
  weekly_execution_plan: WeeklyPlanItem[];
  task_backlog: string[];
  dependencies: string[];
  launch_checklist: string[];
  risk_register: { risk: string; mitigation: string }[];
  first_72_hours: string[];
  decision_rules: string[];
  distribution_recommendation: string;
  success_metric: string;
}

const PHASE_SPLITS: Record<LaunchTimeframe, [number, number]> = {
  "1-week": [0.4, 0.4],
  "2-weeks": [0.5, 0.3],
  "30-days": [0.5, 0.3],
  "60-days": [0.55, 0.3],
};

function dayPick(total: number, fraction: number) {
  return Math.max(1, Math.round(total * fraction));
}

function buildMilestones(input: CreatorLaunchpadInput): MilestoneItem[] {
  const total = TIMEFRAME_DAYS[input.launch_timeframe];
  const [preFrac, launchFrac] = PHASE_SPLITS[input.launch_timeframe];
  const preEnd = dayPick(total, preFrac);
  const launchEnd = Math.min(total, preEnd + dayPick(total, launchFrac));

  const project = input.project_name || "your project";
  const outcome = input.target_outcome || "your launch outcome";

  const items: MilestoneItem[] = [
    { day: 1, phase: "pre-launch", title: "Lock the promise", detail: `Write one sentence committing to "${outcome}" via "${project}".` },
    { day: Math.max(2, Math.round(preEnd * 0.3)), phase: "pre-launch", title: "Tease the problem", detail: `Publish 2 posts naming the pain "${project}" solves — without revealing the offer.` },
    { day: Math.max(3, Math.round(preEnd * 0.6)), phase: "pre-launch", title: "Open the waitlist", detail: `Stand up a one-page waitlist tied to ${outcome}.` },
    { day: preEnd, phase: "pre-launch", title: "Pre-launch proof", detail: `Share one piece of social proof or behind-the-scenes that makes ${project} feel inevitable.` },
    { day: preEnd + 1, phase: "launch", title: "Launch announcement", detail: `Publish the launch post on every owned channel. Pin it. Email the waitlist within 1 hour.` },
    { day: Math.round((preEnd + launchEnd) / 2), phase: "launch", title: "Objection volley", detail: `Address the 3 most common objections to ${project} in 3 separate posts.` },
    { day: Math.max(launchEnd - 1, preEnd + 2), phase: "launch", title: "Urgency window", detail: `Announce a real deadline or bonus that closes at end of Day ${launchEnd}.` },
    { day: launchEnd, phase: "launch", title: "Close the window", detail: `Last-call post + email. Move undecided leads to a follow-up sequence.` },
    { day: Math.min(total, launchEnd + 2), phase: "post-launch", title: "Public recap", detail: `Share the numbers (good or bad). Builds trust for the next launch.` },
    { day: total, phase: "post-launch", title: "Next-step offer", detail: `Give non-buyers a smaller, lower-friction next step tied to ${outcome}.` },
  ];

  return items.filter((m) => m.day <= total).sort((a, b) => a.day - b.day);
}

function buildWeeklyPlan(input: CreatorLaunchpadInput): WeeklyPlanItem[] {
  const total = TIMEFRAME_DAYS[input.launch_timeframe];
  const weeks = Math.max(1, Math.ceil(total / 7));
  const time = input.available_time_per_week || "8 hours/week";
  const project = input.project_name || "your project";
  const result: WeeklyPlanItem[] = [];
  for (let w = 1; w <= weeks; w++) {
    if (w === 1) {
      result.push({
        week: w,
        focus: `Foundation (${time} budget)`,
        tasks: [
          `Write the 1-sentence promise + waitlist headline.`,
          `Ship the waitlist page (one-pager, one CTA, no nav).`,
          `Draft 3 problem-tease posts.`,
        ],
      });
    } else if (w === weeks) {
      result.push({
        week: w,
        focus: `Recap + next step`,
        tasks: [
          `Write the public recap (numbers + what changed).`,
          `Email the next-step offer to non-buyers.`,
          `Schedule a Monday review to decide v2 of ${project}.`,
        ],
      });
    } else {
      result.push({
        week: w,
        focus: `Build momentum`,
        tasks: [
          `Ship 3 pillar posts (problem / proof / solution).`,
          `DM 5 warm contacts with a tailored heads-up.`,
          `Iterate the waitlist headline based on conversion.`,
        ],
      });
    }
  }
  return result;
}

export function generateCreatorLaunchpad(input: CreatorLaunchpadInput): CreatorLaunchpadOutput {
  const project = input.project_name || "your project";
  const outcome = input.target_outcome || "your launch outcome";
  const constraints = input.constraints || "none stated";

  const milestone_map = buildMilestones(input);
  const weekly_execution_plan = buildWeeklyPlan(input);

  return {
    launch_summary: `Launch "${project}" in ${TIMEFRAME_LABELS[input.launch_timeframe]} from current stage "${STAGE_LABELS[input.current_stage]}", aiming for "${outcome}". Time budget: ${input.available_time_per_week || "8 hours/week"}. Constraints: ${constraints}.`,
    milestone_map,
    weekly_execution_plan,
    task_backlog: [
      `Write 1-sentence promise tied to "${outcome}".`,
      `Build 1-page waitlist with single CTA.`,
      `Set up email capture + first 3 sequenced emails.`,
      `Create launch graphic + on-screen text overlay.`,
      `Pre-record 5 short-form videos addressing objections.`,
      `Set up payment / signup flow + test end-to-end.`,
      `Identify 10 warm contacts for personal DMs.`,
      `Draft launch-day post + email + DM templates.`,
      `Publish recap doc template (pre-fill what you can).`,
    ],
    dependencies: [
      `Waitlist must be live before pre-launch teasers (don't drive to nothing).`,
      `Payment flow tested with a $1 transaction before launch announcement.`,
      `Email sequence written before Day 1 (don't write at midnight).`,
    ],
    launch_checklist: [
      `[ ] Waitlist live + tested`,
      `[ ] Promise sentence pinned where you'll see it daily`,
      `[ ] Launch post drafted + scheduled`,
      `[ ] Email sequence loaded + first email scheduled`,
      `[ ] Payment / signup flow tested end-to-end`,
      `[ ] Objection-volley posts pre-written`,
      `[ ] Recap doc template open`,
      `[ ] Calendar blocked for the launch window`,
    ],
    risk_register: [
      { risk: "No waitlist before launch day", mitigation: "Launch the waitlist on Day 3 max — even if ugly. Iterate live." },
      { risk: "Single-channel launch", mitigation: "Add 1 secondary channel (newsletter or DM) on Day 1 of launch." },
      { risk: "No deadline or urgency", mitigation: "Announce a real deadline by Day 1 of launch — close it, even if small." },
      { risk: "Burning out before recap", mitigation: "Pre-write the recap template before launch day. 30 min after, you fill it in." },
    ],
    first_72_hours: [
      `Hour 0–4: Write the promise sentence. Ship the waitlist page. Tweet/post the first tease.`,
      `Hour 4–24: Add 2 more tease posts. DM 3 warm contacts. Set the launch date publicly.`,
      `Hour 24–72: Build the email sequence. Pre-record 3 short videos. Test payment flow once.`,
    ],
    decision_rules: [
      `If waitlist conversion < 20% by Day ${Math.round(TIMEFRAME_DAYS[input.launch_timeframe] * 0.3)}: rewrite headline before adding traffic.`,
      `If no replies to teasers by Day ${Math.round(TIMEFRAME_DAYS[input.launch_timeframe] * 0.4)}: change angle, not channel.`,
      `If launch day < 30% of forecast in first 6 hours: extend window 24h with a real bonus, then close hard.`,
    ],
    distribution_recommendation: `Pre-launch: own audience + 1 paid channel for waitlist. Launch day: every owned channel within 1 hour, then drip 1 post / day. Post-launch: recap on long-form first, then short-form.`,
    success_metric: `% of waitlist that converts in the launch window — target ≥ 8%. Anchor decisions to "${outcome}".`,
  };
}

export function formatCreatorLaunchpad(
  input: CreatorLaunchpadInput,
  out: CreatorLaunchpadOutput,
): string {
  const phaseLabel = (p: MilestoneItem["phase"]) =>
    p === "pre-launch" ? "PRE" : p === "launch" ? "LAUNCH" : "POST";
  return [
    `PROJECT: ${input.project_name}`,
    `GOAL: ${input.project_goal}`,
    `TIMEFRAME: ${TIMEFRAME_LABELS[input.launch_timeframe]} · STAGE: ${STAGE_LABELS[input.current_stage]}`,
    `TARGET OUTCOME: ${input.target_outcome}`,
    `TIME / WEEK: ${input.available_time_per_week} · CONSTRAINTS: ${input.constraints || "none"}`,
    "",
    "LAUNCH SUMMARY",
    out.launch_summary,
    "",
    "MILESTONES",
    ...out.milestone_map.map(
      (m) => `Day ${m.day} · [${phaseLabel(m.phase)}] ${m.title} — ${m.detail}`,
    ),
    "",
    "WEEKLY EXECUTION PLAN",
    ...out.weekly_execution_plan.flatMap((w) => [
      `Week ${w.week} — ${w.focus}`,
      ...w.tasks.map((t, i) => `  ${i + 1}. ${t}`),
    ]),
    "",
    "TASK BACKLOG",
    ...out.task_backlog.map((t, i) => `${i + 1}. ${t}`),
    "",
    "DEPENDENCIES",
    ...out.dependencies.map((d, i) => `${i + 1}. ${d}`),
    "",
    "LAUNCH CHECKLIST",
    ...out.launch_checklist,
    "",
    "RISK REGISTER",
    ...out.risk_register.map((r, i) => `${i + 1}. ${r.risk} → ${r.mitigation}`),
    "",
    "FIRST 72 HOURS",
    ...out.first_72_hours.map((h, i) => `${i + 1}. ${h}`),
    "",
    "DECISION RULES",
    ...out.decision_rules.map((d, i) => `${i + 1}. ${d}`),
    formatFooter({
      nextSteps: [
        `Stand up the waitlist page today (one-pager, one CTA, no nav).`,
        `Pin the Day-1 promise sentence where you'll see it daily.`,
        `Block the launch-window dates on your calendar — protect them like meetings.`,
        `Pre-write the launch-day post + waitlist email tonight; queue them.`,
      ],
      distribution: out.distribution_recommendation,
      successMetric: out.success_metric,
    }),
  ].join("\n");
}
