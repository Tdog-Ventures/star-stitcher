import { StubEngine } from "@/components/engine/StubEngine";
import {
  formatBlueprint,
  generateBlueprint,
  MONETISATION_LABELS,
  type MonetisationGoal,
} from "@/lib/engines/creator-blueprint";

const CreatorBlueprint = () => (
  <StubEngine
    engineKey="creator_blueprint"
    assetType="blueprint"
    title="Creator Blueprint"
    description="Strategy blueprint that ties niche, audience and monetisation goal into one repeatable plan."
    intro="Output: positioning, content pillars, weekly cadence, funnel, north-star metric, 90-day roadmap."
    sample={{
      niche: "Cold-email playbooks for B2B SaaS founders",
      audience: "Solo founders shipping their first paid product",
      monetisation: "services" satisfies MonetisationGoal,
    }}
    fields={[
      {
        key: "niche",
        label: "Niche",
        placeholder: "What you teach / who you help and how",
        required: true,
      },
      {
        key: "audience",
        label: "Audience",
        placeholder: "Specific persona — role, stage, problem",
        required: true,
      },
      {
        key: "monetisation",
        label: "Monetisation goal",
        options: (Object.keys(MONETISATION_LABELS) as MonetisationGoal[]).map(
          (k) => ({ value: k, label: MONETISATION_LABELS[k] }),
        ),
      },
    ]}
    buildTitle={(v) => `Blueprint: ${v.niche || "Untitled niche"}`}
    buildContent={(v) =>
      formatBlueprint(
        {
          niche: v.niche,
          audience: v.audience,
          monetisation: v.monetisation as MonetisationGoal,
        },
        generateBlueprint({
          niche: v.niche,
          audience: v.audience,
          monetisation: v.monetisation as MonetisationGoal,
        }),
      )
    }
  />
);

export default CreatorBlueprint;
