import { generateBlueprint, formatBlueprint } from "./src/lib/engines/creator-blueprint";
import { generateLaunchPlan, formatLaunchPlan } from "./src/lib/engines/creator-launchpad";
import { generateSceneBrief, formatSceneBrief } from "./src/lib/engines/neon-studio";
import { generateBatch, formatBatch } from "./src/lib/engines/video-velocity";
import { generatePartnerBrief, formatPartnerBrief } from "./src/lib/engines/partner-program";
import { generateGrowthPlan, formatGrowthPlan } from "./src/lib/engines/growth-hub";
import { generateVideoScript, formatScriptAsContent } from "./src/lib/video-forge";

const samples = [
  ["VIDEO FORGE", () => formatScriptAsContent(generateVideoScript({ goal: "marketing", topic: "Cold email that books calls", audience: "B2B SaaS founders under $50k MRR", tone: "casual", length: "medium" }))],
  ["CREATOR BLUEPRINT", () => formatBlueprint({ niche: "Cold email for B2B SaaS", audience: "Solo founders", monetisation: "services" }, generateBlueprint({ niche: "Cold email for B2B SaaS", audience: "Solo founders", monetisation: "services" }))],
  ["CREATOR LAUNCHPAD", () => formatLaunchPlan({ projectIdea: "Cold Email Audit ($299)", timeframe: "30-days", outcome: "Book 20 paid audits" }, generateLaunchPlan({ projectIdea: "Cold Email Audit ($299)", timeframe: "30-days", outcome: "Book 20 paid audits" }))],
  ["NEON STUDIO", () => formatSceneBrief({ visualStyle: "neon-cyberpunk", scene: "Founder typing into a glowing terminal at 2am", platform: "tiktok" }, generateSceneBrief({ visualStyle: "neon-cyberpunk", scene: "Founder typing into a glowing terminal at 2am", platform: "tiktok" }))],
  ["VIDEO VELOCITY", () => formatBatch({ batchTopic: "Why most cold email fails", videoCount: "5", platform: "tiktok" }, generateBatch({ batchTopic: "Why most cold email fails", videoCount: "5", platform: "tiktok" }))],
  ["PARTNER PROGRAM", () => formatPartnerBrief({ product: "Cold Email Audit", targetPartner: "B2B sales newsletter operators", commissionModel: "lifetime-revshare" }, generatePartnerBrief({ product: "Cold Email Audit", targetPartner: "B2B sales newsletter operators", commissionModel: "lifetime-revshare" }))],
  ["GROWTH HUB", () => formatGrowthPlan({ goal: "10 booked audits/wk", channel: "cold-email", bottleneck: "low-conversion" }, generateGrowthPlan({ goal: "10 booked audits/wk", channel: "cold-email", bottleneck: "low-conversion" }))],
] as const;

for (const [name, fn] of samples) {
  console.log("\n========== " + name + " ==========");
  console.log(fn());
}
