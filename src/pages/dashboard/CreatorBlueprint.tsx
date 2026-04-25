import { StubEngine } from "@/components/engine/StubEngine";
import {
  BLUEPRINT_PLATFORM_LABELS,
  BLUEPRINT_TIMEFRAME_LABELS,
  CONTENT_STYLE_LABELS,
  formatCreatorBlueprint,
  generateCreatorBlueprint,
  MONETISATION_LABELS,
  type BlueprintPlatform,
  type BlueprintTimeframe,
  type ContentStyle,
  type CreatorBlueprintInput,
  type MonetisationGoal,
} from "@/lib/engines/creator-blueprint";

const toInput = (v: Record<string, string>): CreatorBlueprintInput => ({
  niche: v.niche,
  target_audience: v.target_audience,
  monetisation_goal: v.monetisation_goal as MonetisationGoal,
  content_style: v.content_style as ContentStyle,
  current_assets: v.current_assets,
  primary_platform: v.primary_platform as BlueprintPlatform,
  timeframe: v.timeframe as BlueprintTimeframe,
});

const CreatorBlueprint = () => (
  <StubEngine
    engineKey="creator_blueprint"
    assetType="creator_blueprint"
    title="Creator Blueprint"
    description="Strategy blueprint that ties niche, audience and monetisation goal into one repeatable plan."
    intro="Output: positioning, content pillars, offer ladder, lead magnets, 30-day plan, monetisation path."
    sample={{
      niche: "Cold-email playbooks for B2B SaaS founders",
      target_audience: "Solo founders shipping their first paid product",
      monetisation_goal: "services" satisfies MonetisationGoal,
      content_style: "educational" satisfies ContentStyle,
      current_assets: "Newsletter (800 subs) + Notion playbooks",
      primary_platform: "linkedin" satisfies BlueprintPlatform,
      timeframe: "30-days" satisfies BlueprintTimeframe,
    }}
    fields={[
      { key: "niche", label: "Niche", placeholder: "What you teach / who you help and how", required: true },
      { key: "target_audience", label: "Target audience", placeholder: "Specific persona — role, stage, problem", required: true },
      {
        key: "monetisation_goal",
        label: "Monetisation goal",
        options: (Object.keys(MONETISATION_LABELS) as MonetisationGoal[]).map((k) => ({
          value: k,
          label: MONETISATION_LABELS[k],
        })),
      },
      {
        key: "content_style",
        label: "Content style",
        options: (Object.keys(CONTENT_STYLE_LABELS) as ContentStyle[]).map((k) => ({
          value: k,
          label: CONTENT_STYLE_LABELS[k],
        })),
      },
      { key: "current_assets", label: "Current assets", placeholder: "What you already have (list, audience, content)" },
      {
        key: "primary_platform",
        label: "Primary platform",
        options: (Object.keys(BLUEPRINT_PLATFORM_LABELS) as BlueprintPlatform[]).map((k) => ({
          value: k,
          label: BLUEPRINT_PLATFORM_LABELS[k],
        })),
      },
      {
        key: "timeframe",
        label: "Timeframe",
        options: (Object.keys(BLUEPRINT_TIMEFRAME_LABELS) as BlueprintTimeframe[]).map((k) => ({
          value: k,
          label: BLUEPRINT_TIMEFRAME_LABELS[k],
        })),
      },
    ]}
    buildTitle={(v) => `Blueprint: ${v.niche || "Untitled niche"}`}
    buildContent={(v) => formatCreatorBlueprint(toInput(v), generateCreatorBlueprint(toInput(v)))}
    buildOutput={(v) => generateCreatorBlueprint(toInput(v))}
  />
);

export default CreatorBlueprint;
