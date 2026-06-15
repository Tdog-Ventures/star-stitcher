import type { NextApiRequest, NextApiResponse } from "next";
import { runSchedulerOnce } from "../_lib/jobs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const processedJob = await runSchedulerOnce();
    return res.status(200).json({ ok: true, processedJob });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error?.message ?? "Failed to run scheduler" });
  }
}
