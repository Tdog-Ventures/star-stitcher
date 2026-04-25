import { StubEngine } from "@/components/engine/StubEngine";
import {
  BOTTLENECK_LABELS,
  CHANNEL_LABELS,
  EXPERIMENT_DURATION_LABELS,
  formatGrowthHub,
  generateGrowthHub,
  type Bottleneck,
  type CurrentChannel,
  type ExperimentDuration,
  type GrowthHubInput,
} from "@/lib/engines/growth-hub";

const toInput = (v: Record<string, string>): GrowthHubInput => ({
  growth_goal: v.growth_goal,
  current_channel: v.current_channel as CurrentChannel,
  bottleneck: v.bottleneck as Bottleneck,
  current_metrics: v.current_metrics,
  target_metric: v.target_metric,
  experiment_duration: v.experiment_duration as ExperimentDuration,
  available_assets: v.available_assets,
});

const GrowthHub = () => (
  <StubEngine
    engineKey="growth_hub"
    assetType="growth_experiment"
    title="Growth Hub"
    description="ICE-ranked experiment plan tied to your current bottleneck — not generic advice."
    intro="Output: diagnosis, hypothesis, top experiments, test variants, kill conditions, weekly ritual."
    sample={{
      growth_goal: "Get from 2 to 10 booked audit calls per week",
      current_channel: "cold-email" satisfies CurrentChannel,
      bottleneck: "low-conversion" satisfies Bottleneck,
      current_metrics: "200 sends/week · 3% reply · 0.5% calls booked",
      target_metric: "Reply→booked ≥ 25%",
      experiment_duration: "14-days" satisfies ExperimentDuration,
      available_assets: "1 case study, 1 demo video, 1 audit one-pager",
    }}
    fields={[
      { key: "growth_goal", label: "Growth goal", placeholder: "Concrete outcome — number + timeframe", required: true },
      {
        key: "current_channel",
        label: "Current channel",
        options: (Object.keys(CHANNEL_LABELS) as CurrentChannel[]).map((k) => ({
          value: k,
          label: CHANNEL_LABELS[k],
        })),
      },
      {
        key: "bottleneck",
        label: "Bottleneck",
        options: (Object.keys(BOTTLENECK_LABELS) as Bottleneck[]).map((k) => ({
          value: k,
          label: BOTTLENECK_LABELS[k],
        })),
      },
      { key: "current_metrics", label: "Current metrics", placeholder: "Where you are today" },
      { key: "target_metric", label: "Target metric", placeholder: "Where you want to be" },
      {
        key: "experiment_duration",
        label: "Experiment duration",
        options: (Object.keys(EXPERIMENT_DURATION_LABELS) as ExperimentDuration[]).map((k) => ({
          value: k,
          label: EXPERIMENT_DURATION_LABELS[k],
        })),
      },
      { key: "available_assets", label: "Available assets", placeholder: "What you can repurpose" },
    ]}
    buildTitle={(v) => `Growth: ${v.growth_goal || "Untitled goal"}`}
    buildContent={(v) => formatGrowthHub(toInput(v), generateGrowthHub(toInput(v)))}
    buildOutput={(v) => generateGrowthHub(toInput(v))}
  />
);

export default GrowthHub;
