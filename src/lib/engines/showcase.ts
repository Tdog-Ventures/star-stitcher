// ETHINX Showcase — packages finished work into public-facing portfolio,
// case study, or proof assets.
import { formatFooter } from "./output-footer";

export type ShowcaseFormat =
  | "case-study"
  | "portfolio-card"
  | "twitter-thread"
  | "linkedin-post"
  | "long-form-article";

export const SHOWCASE_FORMAT_LABELS: Record<ShowcaseFormat, string> = {
  "case-study": "Case study",
  "portfolio-card": "Portfolio card",
  "twitter-thread": "Twitter / X thread",
  "linkedin-post": "LinkedIn post",
  "long-form-article": "Long-form article",
};

export interface ShowcaseInput {
  project_name: string;
  asset_or_campaign_summary: string;
  result_or_metric: string;
  target_viewer: string;
  showcase_format: ShowcaseFormat;
  proof_points: string;
  cta: string;
}

export interface ShowcaseOutput {
  showcase_title: string;
  project_summary: string;
  problem: string;
  process: string[];
  output_created: string;
  results: string;
  proof_points: string[];
  public_description: string;
  case_study_copy: string;
  portfolio_card_copy: string;
  cta: string;
  distribution_recommendation: string;
  success_metric: string;
}

export function generateShowcase(input: ShowcaseInput): ShowcaseOutput {
  const project = input.project_name || "the project";
  const viewer = input.target_viewer || "a future client";
  const result = input.result_or_metric || "a measurable result";
  const summary = input.asset_or_campaign_summary || "the work shipped";
  const proofPoints = input.proof_points
    ? input.proof_points.split(/\n|·|;/).map((p) => p.trim()).filter(Boolean)
    : [`${result} achieved`, `Shipped without external dependencies`, `Repeatable system documented`];
  const cta = input.cta || `Want similar results? Reply to start a 15-min audit.`;

  const showcase_title = `${project}: ${result}`;
  const project_summary = `${project} delivered ${result} for ${viewer}. ${summary}`;
  const problem = `${viewer} was stuck on a problem that looked like a content / distribution issue, but was actually a system issue. They had inputs and time — what they didn't have was a repeatable way to package and ship.`;
  const process = [
    `Diagnose the real bottleneck (not the stated one).`,
    `Pick the smallest unit of output that proves the system works.`,
    `Ship that unit through the pipeline (engine → asset → distribution).`,
    `Measure against one number — not a vanity dashboard.`,
    `Codify what worked into a checklist before scaling.`,
  ];
  const output_created = summary;
  const results = `Outcome: ${result}. Tied directly to the originating bottleneck — not adjacent metrics.`;

  const public_description = `${showcase_title}. ${project_summary}`;
  const case_study_copy = [
    `# ${showcase_title}`,
    "",
    `**Who it's for:** ${viewer}`,
    "",
    `## The problem`,
    problem,
    "",
    `## What we shipped`,
    output_created,
    "",
    `## The process`,
    ...process.map((p, i) => `${i + 1}. ${p}`),
    "",
    `## Results`,
    results,
    "",
    `## Proof`,
    ...proofPoints.map((p) => `- ${p}`),
    "",
    `## Want this for your project?`,
    cta,
  ].join("\n");

  const portfolio_card_copy = [
    `${showcase_title}`,
    `For ${viewer}.`,
    `Output: ${output_created}.`,
    `Result: ${result}.`,
    `→ ${cta}`,
  ].join(" · ");

  return {
    showcase_title,
    project_summary,
    problem,
    process,
    output_created,
    results,
    proof_points: proofPoints,
    public_description,
    case_study_copy,
    portfolio_card_copy,
    cta,
    distribution_recommendation: `Publish the long-form ${SHOWCASE_FORMAT_LABELS[input.showcase_format].toLowerCase()} on your owned site first, then re-cut for one social platform per week. Always link back to the canonical case study URL — never split traffic.`,
    success_metric: `≥ 1 inbound inquiry per 1k impressions on the showcase, attributable via UTM. If the showcase doesn't generate inquiries within 30 days, the proof points need rewriting — not the design.`,
  };
}

export function formatShowcase(input: ShowcaseInput, out: ShowcaseOutput): string {
  return [
    `PROJECT: ${input.project_name}`,
    `FORMAT: ${SHOWCASE_FORMAT_LABELS[input.showcase_format]} · TARGET VIEWER: ${input.target_viewer}`,
    `RESULT / METRIC: ${input.result_or_metric}`,
    `SUMMARY: ${input.asset_or_campaign_summary}`,
    `PROOF POINTS (raw): ${input.proof_points || "—"}`,
    `CTA (input): ${input.cta || "—"}`,
    "",
    `SHOWCASE TITLE: ${out.showcase_title}`,
    "",
    "PROJECT SUMMARY",
    out.project_summary,
    "",
    "PROBLEM",
    out.problem,
    "",
    "PROCESS",
    ...out.process.map((p, i) => `${i + 1}. ${p}`),
    "",
    `OUTPUT CREATED: ${out.output_created}`,
    "",
    `RESULTS: ${out.results}`,
    "",
    "PROOF POINTS",
    ...out.proof_points.map((p, i) => `${i + 1}. ${p}`),
    "",
    `PUBLIC DESCRIPTION: ${out.public_description}`,
    "",
    "CASE STUDY COPY",
    out.case_study_copy,
    "",
    `PORTFOLIO CARD COPY: ${out.portfolio_card_copy}`,
    "",
    `CTA: ${out.cta}`,
    formatFooter({
      nextSteps: [
        `Lock the canonical URL where the showcase will live (own domain).`,
        `Drop in 1 hero image + 1 metric graphic — text alone won't carry the case study.`,
        `Publish, then send to 5 past clients / referrers privately before any public push.`,
        `Add the portfolio card to your site nav within 48h.`,
      ],
      distribution: out.distribution_recommendation,
      successMetric: out.success_metric,
    }),
  ].join("\n");
}
