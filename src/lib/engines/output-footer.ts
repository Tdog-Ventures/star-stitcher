// Shared output footer builder for all engine generators.
// Every engine output ends with: NEXT STEPS · DISTRIBUTION · SUCCESS METRIC.
// Keeps the asset format consistent so /assets preview can scan them uniformly.

export interface OutputFooter {
  /** 3–5 immediate, concrete actions the user takes today/this week */
  nextSteps: string[];
  /** How to push this asset out (channel + format hint) */
  distribution: string;
  /** Single, measurable success criterion */
  successMetric: string;
}

export function formatFooter(footer: OutputFooter): string {
  return [
    "",
    "NEXT STEPS",
    ...footer.nextSteps.map((s, i) => `${i + 1}. ${s}`),
    "",
    `DISTRIBUTION: ${footer.distribution}`,
    "",
    `SUCCESS METRIC: ${footer.successMetric}`,
  ].join("\n");
}
