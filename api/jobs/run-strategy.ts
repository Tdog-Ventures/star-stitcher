import type { NextApiRequest, NextApiResponse } from "next";
import { enqueueStrategyJob } from "../_lib/jobs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const topic = (req.body?.topic as string | undefined)?.trim() || "demo_topic";
    const job = await enqueueStrategyJob(topic);
    return res.status(200).json({ ok: true, job });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error?.message ?? "Failed to queue strategy job" });
  }
}
