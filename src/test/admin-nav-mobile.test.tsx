import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Force mobile mode for the entire shadcn sidebar.
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

import { render, screen, cleanup, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminLayout } from "@/components/layouts/AdminLayout";

import CommandBoard from "@/pages/admin/CommandBoard";
import Clients from "@/pages/admin/Clients";
import Deployments from "@/pages/admin/Deployments";
import Agents from "@/pages/admin/Agents";
import Workflows from "@/pages/admin/Workflows";
import Revenue from "@/pages/admin/Revenue";
import Content from "@/pages/admin/Content";
import AdminSupport from "@/pages/admin/AdminSupport";
import AdminSettings from "@/pages/admin/AdminSettings";

const STORAGE_KEY = "ethinx.auth.stub";

function seedAdmin() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ id: "stub-admin", email: "admin@ethinx.dev", role: "admin" }),
  );
}

function renderApp() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              element={
                <ProtectedRoute requireRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/admin" element={<CommandBoard />} />
              <Route path="/admin/clients" element={<Clients />} />
              <Route path="/admin/deployments" element={<Deployments />} />
              <Route path="/admin/agents" element={<Agents />} />
              <Route path="/admin/workflows" element={<Workflows />} />
              <Route path="/admin/revenue" element={<Revenue />} />
              <Route path="/admin/content" element={<Content />} />
              <Route path="/admin/support" element={<AdminSupport />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

const NAV_STEPS: { link: string; href: string; heading: RegExp }[] = [
  { link: "Clients", href: "/admin/clients", heading: /^Clients$/i },
  { link: "Deployments", href: "/admin/deployments", heading: /Deployments/i },
  { link: "Agents", href: "/admin/agents", heading: /Agents/i },
  { link: "Workflows", href: "/admin/workflows", heading: /Workflows/i },
  { link: "Revenue", href: "/admin/revenue", heading: /Revenue/i },
  { link: "Content Engine", href: "/admin/content", heading: /Content Engine/i },
  { link: "Support", href: "/admin/support", heading: /Support Tickets/i },
  { link: "Settings", href: "/admin/settings", heading: /^Settings$/i },
];

describe("Admin sidebar navigation (mobile)", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    seedAdmin();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  function realErrorCalls() {
    return errorSpy.mock.calls.filter((args) => {
      const first = args[0];
      if (typeof first !== "string") return true;
      // React Router v6 act-warnings (benign) and Radix DialogContent description warning (cosmetic a11y note).
      if (first.includes("not wrapped in act")) return false;
      if (first.includes("Missing `Description`")) return false;
      return true;
    });
  }

  afterEach(() => {
    cleanup();
    localStorage.clear();
    errorSpy.mockRestore();
  });

  it("opens the mobile sheet from the trigger and routes through every link", async () => {
    const user = userEvent.setup({ delay: null });
    renderApp();

    expect(await screen.findByRole("heading", { name: /Command Board/i })).toBeInTheDocument();

    // On mobile, the sidebar is hidden inside a Sheet — links should NOT be in the DOM yet.
    expect(screen.queryByRole("link", { name: /^Clients$/i })).toBeNull();

    for (const step of NAV_STEPS) {
      // Open the sheet via the SidebarTrigger in the header.
      const trigger = screen.getByRole("button", { name: /toggle sidebar/i });
      await act(async () => {
        await user.click(trigger);
      });

      // The sheet is a dialog; wait for it to be in the document.
      const sheet = await screen.findByRole("dialog");
      const link = within(sheet).getByRole("link", { name: new RegExp(`^${step.link}$`, "i") });
      expect(link.getAttribute("href")).toBe(step.href);

      await act(async () => {
        await user.click(link);
      });

      // The sheet stays open (links don't auto-close it). Dismiss with Escape.
      await act(async () => {
        await user.keyboard("{Escape}");
      });
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

      // Radix may leave aria-hidden + scroll lock on body briefly. Clean up so role queries
      // can see the new page heading.
      document.body.style.pointerEvents = "";
      document.body.removeAttribute("data-scroll-locked");
      document
        .querySelectorAll('[data-aria-hidden="true"]')
        .forEach((n) => n.removeAttribute("aria-hidden"));

      // New page rendered
      await waitFor(() => {
        const headings = Array.from(document.querySelectorAll("h1"));
        expect(headings.some((h) => step.heading.test(h.textContent ?? ""))).toBe(true);
      });

      // Layout chrome intact
      expect(screen.getAllByText(/ETHINX · Command Center/i).length).toBeGreaterThan(0);
    }

    expect(realErrorCalls()).toEqual([]);
  });
});
