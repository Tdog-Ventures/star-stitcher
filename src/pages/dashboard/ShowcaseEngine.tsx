import { StubEngine } from "@/components/engine/StubEngine";
import {
  formatShowcase,
  generateShowcase,
  SHOWCASE_FORMAT_LABELS,
  type ShowcaseFormat,
  type ShowcaseInput,
} from "@/lib/engines/showcase";

const toInput = (v: Record<string, string>): ShowcaseInput => ({
  project_name: v.project_name,
  asset_or_campaign_summary: v.asset_or_campaign_summary,
  result_or_metric: v.result_or_metric,
  target_viewer: v.target_viewer,
  showcase_format: v.showcase_format as ShowcaseFormat,
  proof_points: v.proof_points,
  cta: v.cta,
});

const Showcase = () => (
  <StubEngine
    engineKey="ethinx_showcase"
    assetType="showcase_asset"
    title="ETHINX Showcase"
    description="Package finished work into a public-facing case study, portfolio card, or post."
    intro="Output: title, problem, process, results, proof, public description, ready-to-publish copy."
    sample={{
      project_name: "Cold Email Audit launch",
      asset_or_campaign_summary: "30-day launch of $299 productized audit, distributed across LinkedIn + newsletter",
      result_or_metric: "27 paid audits booked, $8,073 revenue",
      target_viewer: "B2B SaaS founders considering a productized service",
      showcase_format: "case-study" satisfies ShowcaseFormat,
      proof_points: "27 paid audits in 30 days · 31% reply rate on outbound · 0 paid ad spend",
      cta: "Book your own audit — 15-min walkthrough",
    }}
    fields={[
      { key: "project_name", label: "Project name", placeholder: "What you're showcasing", required: true },
      { key: "asset_or_campaign_summary", label: "What you shipped", placeholder: "1-2 sentences — the work itself", textarea: true, required: true },
      { key: "result_or_metric", label: "Result / metric", placeholder: "The number that matters", required: true },
      { key: "target_viewer", label: "Target viewer", placeholder: "Who this is meant to convince" },
      {
        key: "showcase_format",
        label: "Showcase format",
        options: (Object.keys(SHOWCASE_FORMAT_LABELS) as ShowcaseFormat[]).map((k) => ({
          value: k,
          label: SHOWCASE_FORMAT_LABELS[k],
        })),
      },
      { key: "proof_points", label: "Proof points", placeholder: "Newline / · / ; separated" },
      { key: "cta", label: "Call to action", placeholder: "What viewers should do next" },
    ]}
    buildTitle={(v) =>
      `Showcase: ${v.project_name || "Untitled project"} — ${v.result_or_metric || "result"}`
    }
    buildContent={(v) => formatShowcase(toInput(v), generateShowcase(toInput(v)))}
    buildOutput={(v) => generateShowcase(toInput(v))}
  />
);

export default Showcase;
