import {
  getNextJob,
  markJobRunning,
  markJobDone,
  markJobFailed,
} from "../queue/jobQueue";
import { runStrategyJob } from "../jobs/strategy.job";
import { runProductionJob } from "../jobs/production.job";
import { runDistributionJob } from "../jobs/distribution.job";
import { runFeedbackJob } from "../jobs/feedback.job";

const handlers = {
  strategy: runStrategyJob,
  production: runProductionJob,
  distribution: runDistributionJob,
  feedback: runFeedbackJob,
} as const;

export async function schedulerLoop() {
  const job = await getNextJob();
  if (!job) return;

  await markJobRunning(job.id);
  try {
    await handlers[job.jobType as keyof typeof handlers](job as never);
    await markJobDone(job.id);
  } catch (err: any) {
    await markJobFailed(job.id, err?.message ?? "Unknown error");
  }
}
