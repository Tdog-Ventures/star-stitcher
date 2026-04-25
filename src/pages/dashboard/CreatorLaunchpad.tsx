import { StubEngine } from "@/components/engine/StubEngine";
import {
  formatLaunchPlan,
  generateLaunchPlan,
  TIMEFRAME_LABELS,
  type LaunchTimeframe,
} from "@/lib/engines/creator-launchpad";

const CreatorLaunchpad = () => (
  <StubEngine
    engineKey="creator_launchpad"
    assetType="launch-plan"
    title="Creator Launchpad"
    description="Milestone-based launch roadmap: pre-launch, launch window, post-launch — sized to your timeframe."
    intro="Output: dated milestones, success metric, and risk flags for the launch."
    sample={{
      projectIdea: "Cold Email Audit ($299 one-off)",
      timeframe: "30-days" satisfies LaunchTimeframe,
      outcome: "Book 20 paid audits in 30 days",
    }}
    fields={[
      {
        key: "projectIdea",
        label: "Project idea",
        placeholder: "What are you launching?",
        required: true,
      },
      {
        key: "timeframe",
        label: "Launch timeframe",
        options: (Object.keys(TIMEFRAME_LABELS) as LaunchTimeframe[]).map(
          (k) => ({ value: k, label: TIMEFRAME_LABELS[k] }),
        ),
      },
      {
        key: "outcome",
        label: "Target outcome",
        placeholder: "Concrete result, in numbers",
        required: true,
      },
    ]}
    buildTitle={(v) => `Launch: ${v.projectIdea || "Untitled launch"}`}
    buildContent={(v) => {
      const input = {
        projectIdea: v.projectIdea,
        timeframe: v.timeframe as LaunchTimeframe,
        outcome: v.outcome,
      };
      return formatLaunchPlan(input, generateLaunchPlan(input));
    }}
  />
);

export default CreatorLaunchpad;
