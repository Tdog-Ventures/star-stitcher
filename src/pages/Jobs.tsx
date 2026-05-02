import React, { useEffect, useMemo, useState } from "react";

type JobStatus = "pending" | "running" | "done" | "failed";
type JobType = "strategy" | "production" | "distribution" | "feedback";

interface Job {
  id: string;
  jobType: JobType;
  status: JobStatus;
  payload: Record<string, unknown>;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
}

const STATUS_COLORS: Record<JobStatus, string> = {
  pending: "#f59e0b",
  running: "#3b82f6",
  done: "#10b981",
  failed: "#ef4444",
};

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("demo_topic");
  const [actionLoading, setActionLoading] = useState<"strategy" | "scheduler" | null>(null);

  const load = async () => {
    try {
      setError(null);
      const response = await fetch("/api/jobs");
      if (!response.ok) throw new Error(`Failed to fetch jobs (${response.status})`);
      const data = (await response.json()) as Job[];
      setJobs(data);
    } catch (err: any) {
      setError(err?.message ?? "Unable to load jobs");
    }
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    const id = window.setInterval(load, 2000);
    return () => window.clearInterval(id);
  }, []);

  const runStrategy = async () => {
    try {
      setActionLoading("strategy");
      const response = await fetch("/api/jobs/run-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() || "demo_topic" }),
      });
      if (!response.ok) throw new Error(`Run strategy failed (${response.status})`);
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to run strategy job");
    } finally {
      setActionLoading(null);
    }
  };

  const runScheduler = async () => {
    try {
      setActionLoading("scheduler");
      const response = await fetch("/api/scheduler/run", { method: "POST" });
      if (!response.ok) throw new Error(`Run scheduler failed (${response.status})`);
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to run scheduler");
    } finally {
      setActionLoading(null);
    }
  };

  const timeline = useMemo(() => [...jobs].reverse(), [jobs]);

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>ETHINX Job Monitor</h1>
      <p style={{ marginTop: 0, opacity: 0.75 }}>Live queue view with manual scheduler controls</p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="strategy topic"
          style={{ minWidth: 220, padding: "8px 10px", borderRadius: 6, border: "1px solid #444" }}
        />
        <button onClick={runStrategy} disabled={actionLoading !== null} style={{ padding: "8px 12px" }}>
          {actionLoading === "strategy" ? "Queueing..." : "Run Strategy Job"}
        </button>
        <button onClick={runScheduler} disabled={actionLoading !== null} style={{ padding: "8px 12px" }}>
          {actionLoading === "scheduler" ? "Running..." : "Run Scheduler Now"}
        </button>
      </div>

      {loading && <div style={{ marginBottom: 12 }}>Loading jobs...</div>}
      {error && <div style={{ marginBottom: 12, color: "#ef4444" }}>{error}</div>}

      <div style={{ marginBottom: 20 }}>
        <h3>Live Timeline</h3>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6 }}>
          {timeline.length === 0 && <span style={{ opacity: 0.7 }}>No jobs yet.</span>}
          {timeline.map((job) => (
            <div
              key={`${job.id}-timeline`}
              title={`${job.jobType} • ${job.status} • ${new Date(job.createdAt).toLocaleString()}`}
              style={{
                minWidth: 14,
                height: 14,
                borderRadius: 999,
                background: STATUS_COLORS[job.status],
                border: "1px solid #1f2937",
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        {jobs.map((job) => (
          <div
            key={job.id}
            style={{
              padding: 12,
              marginBottom: 10,
              border: "1px solid #444",
              borderRadius: 6,
              background: "#0b11201a",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <strong>{job.jobType.toUpperCase()}</strong>
              <span style={{ color: STATUS_COLORS[job.status], fontWeight: 600 }}>{job.status}</span>
            </div>

            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
              Created: {new Date(job.createdAt).toLocaleString()}
            </div>
            {job.startedAt && (
              <div style={{ fontSize: 12, opacity: 0.8 }}>Started: {new Date(job.startedAt).toLocaleString()}</div>
            )}
            {job.completedAt && (
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Completed: {new Date(job.completedAt).toLocaleString()}
              </div>
            )}
            {job.failedAt && (
              <div style={{ fontSize: 12, color: "#ef4444" }}>Failed: {new Date(job.failedAt).toLocaleString()}</div>
            )}
            {job.errorMessage && <div style={{ fontSize: 12, color: "#ef4444" }}>Error: {job.errorMessage}</div>}

            <pre style={{ fontSize: 12, marginTop: 8, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(job.payload ?? {}, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
