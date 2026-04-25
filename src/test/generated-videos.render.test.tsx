import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { deriveRenderUi } from "@/lib/render-state";

// ---- Pure helper -----------------------------------------------------------

describe("deriveRenderUi", () => {
  it("returns idle when no job and no url", () => {
    expect(deriveRenderUi({ render_job_id: null, rendered_video_url: null })).toBe("idle");
  });
  it("returns rendering when job is set but no url", () => {
    expect(deriveRenderUi({ render_job_id: "stub_abc", rendered_video_url: null })).toBe("rendering");
  });
  it("returns complete when url is present (even if job is also set)", () => {
    expect(
      deriveRenderUi({ render_job_id: "stub_abc", rendered_video_url: "https://x.mp4" }),
    ).toBe("complete");
  });
});

// ---- Page-level render integration ----------------------------------------

const ASSET_ID = "11111111-1111-1111-1111-111111111111";
const sampleAsset = {
  id: ASSET_ID,
  title: "AI video ads for local businesses",
  engine_key: "video_forge",
  channel: "YouTube",
  status: "draft",
  source_record_id: null,
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

const invokeMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: () => Promise.resolve({ data: null, error: null }) }));

vi.mock("@/integrations/supabase/client", () => {
  const tableData: Record<string, unknown[]> = {
    assets: [sampleAsset],
    distribution_tasks: [],
    user_roles: [{ role: "user" }],
  };

  const fromAssets = () => {
    const result: Promise<{ data: unknown; error: null }> & Record<string, unknown> =
      Promise.resolve({ data: tableData.assets, error: null }) as never;
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => Promise.resolve({ data: tableData.assets, error: null }),
      update: updateMock,
    };
    return Object.assign(result, chain);
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
          const c = {
            select: () => c,
            eq: () => Promise.resolve({ data: [{ role: "user" }], error: null }),
          };
          return c;
        }
        const c = {
          select: () => c,
          eq: () => c,
          order: () => Promise.resolve({ data: [], error: null }),
          insert: () => ({
            select: () => ({ single: () => Promise.resolve({ data: { id: "t1" }, error: null }) }),
          }),
        };
        return c;
      },
      functions: {
        invoke: (...args: unknown[]) => invokeMock(...args),
      },
    },
  };
});

// Lightweight stubs for the bits the page imports but we don't need to render.
vi.mock("@/lib/analytics", () => ({ trackEvent: () => Promise.resolve() }));

import GeneratedVideos from "@/pages/dashboard/GeneratedVideos";

const renderPage = () =>
  render(
    <MemoryRouter>
      <GeneratedVideos />
    </MemoryRouter>,
  );

describe("GeneratedVideos — FacelessForge render integration (stub)", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    updateMock.mockClear();
    sampleAsset.render_job_id = null;
    sampleAsset.rendered_video_url = null;
    sampleAsset.render_status = null;
  });

  it("shows the stub banner so users know no MP4 is produced", async () => {
    renderPage();
    expect(await screen.findByTestId("render-stub-banner")).toBeInTheDocument();
    expect(screen.getByText(/Render integration stub/i)).toBeInTheDocument();
  });

  it("invokes render-video with the full payload when clicked", async () => {
    const user = userEvent.setup();
    invokeMock.mockResolvedValueOnce({
      data: { job_id: "stub_xyz", status: "pending", stub: true },
      error: null,
    });

    renderPage();
    const btn = await screen.findByTestId("render-video");
    await user.click(btn);

    await waitFor(() => expect(invokeMock).toHaveBeenCalled());
    const [fnName, opts] = invokeMock.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fnName).toBe("render-video");
    expect(opts.body).toMatchObject({
      asset_id: ASSET_ID,
      title: sampleAsset.title,
      script: "Hook line. Body. CTA.",
      stock_footage_terms: ["small business", "automation"],
      captions: { short_caption: "Short", long_caption: "Long" },
    });
    expect(Array.isArray(opts.body.scene_breakdown)).toBe(true);
  });

  it("never renders a Download MP4 button while in stub mode (no rendered_video_url)", async () => {
    // Simulate the post-click DB state: job_id stored, url still null.
    sampleAsset.render_job_id = "stub_persisted";
    sampleAsset.rendered_video_url = null;

    invokeMock.mockResolvedValue({
      data: { job_id: "stub_persisted", status: "completed", video_url: null, stub: true },
      error: null,
    });

    renderPage();
    // Button is in "rendering" state because job_id exists but url is null.
    expect(await screen.findByTestId("render-pending")).toBeInTheDocument();
    // Critically: never claims an MP4 exists.
    expect(screen.queryByTestId("download-mp4")).not.toBeInTheDocument();
    // Banner must remain visible.
    expect(screen.getByTestId("render-stub-banner")).toBeInTheDocument();
  });

  it("shows Download MP4 only once rendered_video_url is populated (real-mode scenario)", async () => {
    sampleAsset.render_job_id = "real_job";
    sampleAsset.rendered_video_url = "https://cdn.example.com/video.mp4";

    renderPage();
    const link = await screen.findByTestId("download-mp4");
    expect(link).toHaveAttribute("href", "https://cdn.example.com/video.mp4");
  });
});

// Suppress noisy timers if any test added them.
afterAllReset();
function afterAllReset() {
  // no-op placeholder; vitest's afterAll not needed since tests don't install timers.
  void act;
}
