import { StubEngine } from "@/components/engine/StubEngine";
import {
  formatBatch,
  generateBatch,
  VELOCITY_PLATFORM_LABELS,
  type VelocityPlatform,
} from "@/lib/engines/video-velocity";

const VIDEO_COUNTS = ["3", "5", "7", "10", "12"];

const VideoVelocity = () => (
  <StubEngine
    engineKey="video_velocity"
    assetType="video-batch-plan"
    title="Video Velocity"
    description="Batch production plan: one topic, N angles, one filming session."
    intro="Output: per-video script beats, shoot plan, and publish cadence."
    sample={{
      batchTopic: "Why most cold email fails in the first line",
      videoCount: "7",
      platform: "tiktok" satisfies VelocityPlatform,
    }}
    fields={[
      {
        key: "batchTopic",
        label: "Batch topic",
        placeholder: "One sentence — the spine of every video",
        required: true,
      },
      {
        key: "videoCount",
        label: "Number of videos",
        options: VIDEO_COUNTS.map((c) => ({ value: c, label: c })),
      },
      {
        key: "platform",
        label: "Target platform",
        options: (Object.keys(VELOCITY_PLATFORM_LABELS) as VelocityPlatform[]).map(
          (k) => ({ value: k, label: VELOCITY_PLATFORM_LABELS[k] }),
        ),
      },
    ]}
    buildTitle={(v) =>
      `Velocity batch: ${v.batchTopic || "Untitled"} (${v.videoCount} videos)`
    }
    buildContent={(v) => {
      const input = {
        batchTopic: v.batchTopic,
        videoCount: v.videoCount,
        platform: v.platform as VelocityPlatform,
      };
      return formatBatch(input, generateBatch(input));
    }}
  />
);

export default VideoVelocity;
