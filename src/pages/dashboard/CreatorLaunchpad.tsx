import { StubEngine } from "@/components/engine/StubEngine";
import {
  formatCreatorLaunchpad,
  generateCreatorLaunchpad,
  STAGE_LABELS,
  TIMEFRAME_LABELS,
  type CreatorLaunchpadInput,
  type LaunchStage,
  type LaunchTimeframe,
} from "@/lib/engines/creator-launchpad";

const toInput = (v: Record<string, string>): CreatorLaunchpadInput => ({
  project_name: v.project_name,
  project_goal: v.project_goal,
  launch_timeframe: v.launch_timeframe as LaunchTimeframe,
  target_outcome: v.target_outcome,
  available_time_per_week: v.available_time_per_week,
  current_stage: v.current_stage as LaunchStage,
  constraints: v.constraints,
});

const CreatorLaunchpad = () => (
  <StubEngine
    engineKey="creator_launchpad"
    assetType="launch_plan"
    title="Creator Launchpad"
    description="Milestone-based launch roadmap: pre-launch, launch window, post-launch — sized to your timeframe."
    intro="Output: dated milestones, weekly plan, task backlog, checklist, risks, decision rules."
    sample={{
      project_name: "Cold Email Audit ($299 one-off)",
      project_goal: "Validate productized service before scaling",
      launch_timeframe: "30-days" satisfies LaunchTimeframe,
      target_outcome: "Book 20 paid audits in 30 days",
      available_time_per_week: "8 hours/week",
      current_stage: "ready-to-launch" satisfies LaunchStage,
      constraints: "Solo, no paid ads budget",
    }}
    fields={[
      { key: "project_name", label: "Project name", placeholder: "What are you launching?", required: true },
      { key: "project_goal", label: "Project goal", placeholder: "Why this launch matters", required: true },
      {
        key: "launch_timeframe",
        label: "Launch timeframe",
        options: (Object.keys(TIMEFRAME_LABELS) as LaunchTimeframe[]).map((k) => ({
          value: k,
          label: TIMEFRAME_LABELS[k],
        })),
      },
      { key: "target_outcome", label: "Target outcome", placeholder: "Concrete result, in numbers", required: true },
      { key: "available_time_per_week", label: "Time per week", placeholder: "e.g. 8 hours/week" },
      {
        key: "current_stage",
        label: "Current stage",
        options: (Object.keys(STAGE_LABELS) as LaunchStage[]).map((k) => ({
          value: k,
          label: STAGE_LABELS[k],
        })),
      },
      { key: "constraints", label: "Constraints", placeholder: "Budget, team, dependencies" },
    ]}
    buildTitle={(v) => `Launch: ${v.project_name || "Untitled launch"}`}
    buildContent={(v) => formatCreatorLaunchpad(toInput(v), generateCreatorLaunchpad(toInput(v)))}
    buildOutput={(v) => generateCreatorLaunchpad(toInput(v))}
  />
);

export default CreatorLaunchpad;
