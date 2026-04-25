import { StubEngine } from "@/components/engine/StubEngine";
import {
  BOTTLENECK_LABELS,
  CHANNEL_LABELS,
  formatGrowthPlan,
  generateGrowthPlan,
  type Bottleneck,
  type CurrentChannel,
} from "@/lib/engines/growth-hub";

const GrowthHub = () => (
  <StubEngine
    engineKey="growth_hub"
    assetType="growth-plan"
    title="Growth Hub"
    description="ICE-ranked experiment plan tied to your current bottleneck — not generic advice."
    intro="Output: diagnosis, north-star metric, top-3 experiments, kill criteria, weekly ritual."
    sample={{
      goal: "Get from 2 to 10 booked audit calls per week",
      channel: "cold-email" satisfies CurrentChannel,
      bottleneck: "low-conversion" satisfies Bottleneck,
    }}
    fields={[
      {
        key: "goal",
        label: "Growth goal",
        placeholder: "Concrete outcome — number + timeframe",
        required: true,
      },
      {
        key: "channel",
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
    ]}
    buildTitle={(v) => `Growth: ${v.goal || "Untitled goal"}`}
    buildContent={(v) => {
      const input = {
        goal: v.goal,
        channel: v.channel as CurrentChannel,
        bottleneck: v.bottleneck as Bottleneck,
      };
      return formatGrowthPlan(input, generateGrowthPlan(input));
    }}
  />
);

export default GrowthHub;
