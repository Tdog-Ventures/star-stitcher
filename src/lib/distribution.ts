import { z } from "zod";

export const CHANNELS = ["LinkedIn", "Email", "X/Twitter", "YouTube", "Blog"] as const;
export type Channel = typeof CHANNELS[number];

export const TASK_STATUSES = ["draft", "queued", "running", "completed", "failed"] as const;
export type TaskStatus = typeof TASK_STATUSES[number];

export const distributeFormSchema = z.object({
  channel: z.enum(CHANNELS, { required_error: "Pick a channel" }),
  campaignName: z
    .string()
    .trim()
    .min(1, "Campaign name is required")
    .max(120, "Keep campaign name under 120 characters"),
  scheduledAt: z
    .string()
    .min(1, "Pick a date and time")
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date/time"),
  notes: z.string().trim().max(2000, "Keep notes under 2000 characters").optional(),
});

export type DistributeFormValues = z.infer<typeof distributeFormSchema>;
