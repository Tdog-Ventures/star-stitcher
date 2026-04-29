import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEvent =
  | "offer_saved"
  | "asset_created"
  | "distribution_task_created"
  | "distribution_task_ready"
  | "video_forge_generated"
  | "video_forge_auto_render_queued";

export async function trackEvent(
  event: AnalyticsEvent,
  properties: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_name: event,
      properties: properties as never,
    });
  } catch (err) {
    // analytics is non-critical
    console.warn("analytics:", event, err);
  }
}
