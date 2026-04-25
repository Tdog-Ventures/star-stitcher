import { StubEngine } from "@/components/engine/StubEngine";
import {
  CONTENT_GOAL_LABELS,
  FREQUENCY_LABELS,
  formatVideoVelocity,
  generateVideoVelocity,
  VELOCITY_PLATFORM_LABELS,
  type ContentGoal,
  type PublishingFrequency,
  type VelocityPlatform,
  type VideoVelocityInput,
} from "@/lib/engines/video-velocity";

const VIDEO_COUNTS = ["3", "5", "7", "10", "12"];

const toInput = (v: Record<string, string>): VideoVelocityInput => ({
  batch_topic: v.batch_topic,
  number_of_videos: v.number_of_videos,
  platform: v.platform as VelocityPlatform,
  audience: v.audience,
  publishing_frequency: v.publishing_frequency as PublishingFrequency,
  content_goal: v.content_goal as ContentGoal,
  source_material: v.source_material,
});

const VideoVelocity = () => (
  <StubEngine
    engineKey="video_velocity"
    assetType="video_batch_plan"
    title="Video Velocity"
    description="Batch production plan: one topic, N angles, one filming session."
    intro="Output: per-video script beats, shoot plan, and publish cadence."
    sample={{
      batch_topic: "Why most cold email fails in the first line",
      number_of_videos: "7",
      platform: "tiktok" satisfies VelocityPlatform,
      audience: "B2B SaaS founders under $50k MRR",
      publishing_frequency: "daily" satisfies PublishingFrequency,
      content_goal: "leads" satisfies ContentGoal,
      source_material: "Last week's audit notes + 3 customer calls",
    }}
    fields={[
      { key: "batch_topic", label: "Batch topic", placeholder: "One sentence — the spine of every video", required: true },
      {
        key: "number_of_videos",
        label: "Number of videos",
        options: VIDEO_COUNTS.map((c) => ({ value: c, label: c })),
      },
      {
        key: "platform",
        label: "Target platform",
        options: (Object.keys(VELOCITY_PLATFORM_LABELS) as VelocityPlatform[]).map((k) => ({
          value: k,
          label: VELOCITY_PLATFORM_LABELS[k],
        })),
      },
      { key: "audience", label: "Audience", placeholder: "Who these are for", required: true },
      {
        key: "publishing_frequency",
        label: "Publishing frequency",
        options: (Object.keys(FREQUENCY_LABELS) as PublishingFrequency[]).map((k) => ({
          value: k,
          label: FREQUENCY_LABELS[k],
        })),
      },
      {
        key: "content_goal",
        label: "Content goal",
        options: (Object.keys(CONTENT_GOAL_LABELS) as ContentGoal[]).map((k) => ({
          value: k,
          label: CONTENT_GOAL_LABELS[k],
        })),
      },
      { key: "source_material", label: "Source material", placeholder: "Notes, transcripts, posts to draw from" },
    ]}
    buildTitle={(v) =>
      `Velocity batch: ${v.batch_topic || "Untitled"} (${v.number_of_videos} videos)`
    }
    buildContent={(v) => formatVideoVelocity(toInput(v), generateVideoVelocity(toInput(v)))}
    buildOutput={(v) => generateVideoVelocity(toInput(v))}
  />
);

export default VideoVelocity;
