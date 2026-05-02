import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type JobStatus = "pending" | "running" | "done" | "failed";
type JobType = "strategy" | "production" | "distribution" | "feedback";

export interface JobQueueRow {
  id: string;
  jobType: JobType;
  status: JobStatus;
  payload: Record<string, unknown>;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  updatedAt: string;
}

let cachedClient: SupabaseClient | null = null;

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url =
    getEnv("SUPABASE_URL") ||
    getEnv("NEXT_PUBLIC_SUPABASE_URL") ||
    getEnv("VITE_SUPABASE_URL");
  const serviceKey =
    getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    getEnv("SUPABASE_SERVICE_KEY") ||
    getEnv("SUPABASE_ANON_KEY");

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for jobs API.");
  }

  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export async function listRecentJobs(limit = 50): Promise<JobQueueRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("job_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    jobType: row.job_type,
    status: row.status,
    payload: row.payload ?? {},
    createdAt: row.created_at,
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at ?? null,
    failedAt: row.failed_at ?? null,
    errorMessage: row.error_message ?? null,
    updatedAt: row.updated_at ?? row.created_at,
  }));
}

export async function enqueueStrategyJob(topic: string): Promise<JobQueueRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("job_queue")
    .insert({
      job_type: "strategy",
      status: "pending",
      payload: { topic },
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    id: String((data as any).id),
    jobType: (data as any).job_type,
    status: (data as any).status,
    payload: (data as any).payload ?? {},
    createdAt: (data as any).created_at,
    startedAt: (data as any).started_at ?? null,
    completedAt: (data as any).completed_at ?? null,
    failedAt: (data as any).failed_at ?? null,
    errorMessage: (data as any).error_message ?? null,
    updatedAt: (data as any).updated_at ?? (data as any).created_at,
  };
}

export async function runSchedulerOnce(): Promise<JobQueueRow | null> {
  const supabase = getSupabaseAdmin();

  const { data: pending, error: fetchError } = await supabase
    .from("job_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!pending) return null;

  const now = new Date().toISOString();
  const jobId = (pending as any).id;

  const { error: markRunningError } = await supabase
    .from("job_queue")
    .update({
      status: "running",
      started_at: now,
      updated_at: now,
    })
    .eq("id", jobId);
  if (markRunningError) throw markRunningError;

  try {
    // Strategy handler placeholder for manual scheduler trigger.
    const completeAt = new Date().toISOString();
    const { data: doneJob, error: markDoneError } = await supabase
      .from("job_queue")
      .update({
        status: "done",
        completed_at: completeAt,
        updated_at: completeAt,
      })
      .eq("id", jobId)
      .select("*")
      .single();
    if (markDoneError) throw markDoneError;

    return {
      id: String((doneJob as any).id),
      jobType: (doneJob as any).job_type,
      status: (doneJob as any).status,
      payload: (doneJob as any).payload ?? {},
      createdAt: (doneJob as any).created_at,
      startedAt: (doneJob as any).started_at ?? null,
      completedAt: (doneJob as any).completed_at ?? null,
      failedAt: (doneJob as any).failed_at ?? null,
      errorMessage: (doneJob as any).error_message ?? null,
      updatedAt: (doneJob as any).updated_at ?? (doneJob as any).created_at,
    };
  } catch (error: any) {
    const failedAt = new Date().toISOString();
    await supabase
      .from("job_queue")
      .update({
        status: "failed",
        failed_at: failedAt,
        error_message: error?.message ?? "Unknown scheduler failure",
        updated_at: failedAt,
      })
      .eq("id", jobId);
    throw error;
  }
}
