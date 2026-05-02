import { prisma } from "../prisma";

export default function jobsRoutes(app: any) {
  app.get("/api/jobs", async (_req: any, res: any) => {
    const jobs = await prisma.jobQueue.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(jobs);
  });

  app.post("/api/jobs/run-strategy", async (req: any, res: any) => {
    const { topic } = req.body;
    const job = await prisma.jobQueue.create({
      data: { jobType: "strategy", payload: { topic } },
    });
    res.json({ ok: true, job });
  });

  app.post("/api/scheduler/run", async (_req: any, res: any) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const scheduler = require("../scheduler/scheduler");
    await scheduler.schedulerLoop();
    res.json({ ok: true });
  });
}
