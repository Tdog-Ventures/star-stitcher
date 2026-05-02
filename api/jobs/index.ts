import type { NextApiRequest, NextApiResponse } from "next";
import { listRecentJobs } from "../_lib/jobs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const jobs = await listRecentJobs(50);
    return res.status(200).json(jobs);
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error?.message ?? "Failed to load jobs" });
  }
}
