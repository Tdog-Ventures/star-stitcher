// Pure helper to derive the FacelessForge render UI state from an asset row.
// Kept tiny and dependency-free so it's trivial to unit-test.

export type RenderUiState = "idle" | "rendering" | "complete" | "failed";

export interface RenderableRow {
  render_job_id: string | null;
  rendered_video_url: string | null;
  render_status: string | null;
}

export function deriveRenderUi(row: RenderableRow): RenderUiState {
  if (row.rendered_video_url) return "complete";
  if (row.render_status === "failed") return "failed";
  if (row.render_job_id) return "rendering";
  return "idle";
}
