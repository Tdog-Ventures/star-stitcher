import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { deriveRenderUi } from "@/lib/render-state";

// ---- Pure helper -----------------------------------------------------------

describe("deriveRenderUi", () => {
  it("returns idle when no job and no url", () => {
    expect(
      deriveRenderUi({ render_job_id: null, rendered_video_url: null, render_status: null }),
    ).toBe("idle");
  });
  it("returns rendering when job is set but no url", () => {
    expect(
      deriveRenderUi({
        render_job_id: "job_abc",
        rendered_video_url: null,
        render_status: "queued",
      }),
    ).toBe("rendering");
  });
  it("returns complete when url is present (even if job is also set)", () => {
    expect(
      deriveRenderUi({
        render_job_id: "job_abc",
        rendered_video_url: "https://x.mp4",
        render_status: "completed",
      }),
    ).toBe("complete");
  });
  it("returns failed when render_status is failed and no url", () => {
    expect(
      deriveRenderUi({
        render_job_id: "job_abc",
        rendered_video_url: null,
        render_status: "failed",
      }),
    ).toBe("failed");
  });
});

// ---- Page-level render integration ----------------------------------------

const ASSET_ID = "11111111-1111-1111-1111-111111111111";

// Hoisted state shared with the supabase mock factory.
const h = vi.hoisted(() => {
  const sampleAsset = {
    id: "11111111-1111-1111-1111-111111111111",
    title: "AI video ads for local businesses",
    engine_key: "video_forge",
    channel: "YouTube",
    status: "draft",
    source_record_id: null as string | null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    content: JSON.stringify({
      v: 1,
      engine_key: "video_forge",
      type: "video_script",
      output: {
        mode: "short_form",
        full_script: "Hook line. Body. CTA.",
        scene_breakdown: [{ duration_seconds: 10 }],
        stock_footage_terms: ["small business", "automation"],
        voiceover_notes: { tone: "bold" },
        captions: { short_caption: "Short", long_caption: "Long" },
      },
      markdown: "# fake\n",
    }),
    render_job_id: null as string | null,
    rendered_video_url: null as string | null,
    render_status: null as string | null,
  };
  return {
    sampleAsset,
    invokeMock: vi.fn(),
  };
});

vi.mock("@/integrations/supabase/client", () => {
  const fromAssets = () => {
    const order = () => Promise.resolve({ data: [h.sampleAsset], error: null });
    const chain = {
      select: () => chain,
      eq: () => chain,
      order,
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    };
    return chain;
  };

  return {
    supabase: {
      auth: {
        getSession: () =>
          Promise.resolve({
            data: {
              session: {
                access_token: "t",
                refresh_token: "t",
                token_type: "bearer",
                expires_in: 3600,
                user: { id: "user-1", email: "u@example.com" },
              },
            },
          }),
        getUser: () =>
          Promise.resolve({ data: { user: { id: "user-1", email: "u@example.com" } } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: () => Promise.resolve({ error: null }),
      },
      from: (table: string) => {
        if (table === "assets") return fromAssets();
        if (table === "user_roles") {
          const c: Record<string, unknown> = {
            select: () => c,
            eq: () => Promise.resolve({ data: [{ role: "user" }], error: null }),
          };
          return c;
        }
        const c: Record<string, unknown> = {
          select: () => c,
          eq: () => c,
          order: () => Promise.resolve({ data: [], error: null }),
        };
        return c;
      },
      functions: {
        invoke: (...args: unknown[]) => h.invokeMock(...args),
      },
    },
  };
});

vi.mock("@/lib/analytics", () => ({ trackEvent: () => Promise.resolve() }));

import GeneratedVideos from "@/pages/dashboard/GeneratedVideos";
import { AuthProvider } from "@/providers/AuthProvider";

const renderPage = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <GeneratedVideos />
      </AuthProvider>
    </MemoryRouter>,
  );

describe("GeneratedVideos — FacelessForge render integration (live)", () => {
  beforeEach(() => {
    h.invokeMock.mockReset();
    h.sampleAsset.render_job_id = null;
    h.sampleAsset.rendered_video_url = null;
    h.sampleAsset.render_status = null;
  });

  it("invokes render-video with the full payload when clicked", async () => {
    const user = userEvent.setup();
    h.invokeMock.mockResolvedValueOnce({
      data: { job_id: "ff_xyz", render_job_id: "ff_xyz", status: "queued" },
      error: null,
    });

    renderPage();
    const btn = await screen.findByTestId("render-video");
    await user.click(btn);

    await waitFor(() => expect(h.invokeMock).toHaveBeenCalled());
    const [fnName, opts] = h.invokeMock.mock.calls[0] as [
      string,
      { body: Record<string, unknown> },
    ];
    expect(fnName).toBe("render-video");
    expect(opts.body).toMatchObject({
      asset_id: ASSET_ID,
      title: h.sampleAsset.title,
      script: "Hook line. Body. CTA.",
      stock_footage_terms: ["small business", "automation"],
      captions: { short_caption: "Short", long_caption: "Long" },
    });
    expect(Array.isArray(opts.body.scene_breakdown)).toBe(true);
  });

  it("shows the Rendering… button while a job is in flight (no MP4 yet)", async () => {
    h.sampleAsset.render_job_id = "ff_inflight";
    h.sampleAsset.render_status = "queued";
    h.sampleAsset.rendered_video_url = null;
    h.invokeMock.mockResolvedValue({
      data: { job_id: "ff_inflight", status: "running", video_url: null },
      error: null,
    });

    renderPage();
    expect(await screen.findByTestId("render-pending")).toBeInTheDocument();
    expect(screen.queryByTestId("download-mp4")).not.toBeInTheDocument();
  });

  it("shows Download MP4 only once rendered_video_url is populated", async () => {
    h.sampleAsset.render_job_id = "ff_done";
    h.sampleAsset.render_status = "completed";
    h.sampleAsset.rendered_video_url = "https://cdn.example.com/video.mp4";

    renderPage();
    const link = await screen.findByTestId("download-mp4");
    expect(link).toHaveAttribute("href", "https://cdn.example.com/video.mp4");
  });

  it("shows a Retry render button when the job failed", async () => {
    h.sampleAsset.render_job_id = "ff_broken";
    h.sampleAsset.render_status = "failed";
    h.sampleAsset.rendered_video_url = null;

    renderPage();
    expect(await screen.findByTestId("render-retry")).toBeInTheDocument();
    expect(screen.getByText(/Render failed\. Try again\./i)).toBeInTheDocument();
  });
});

