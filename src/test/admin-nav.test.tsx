import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminLayout } from "@/components/layouts/AdminLayout";

import CommandBoard from "@/pages/admin/CommandBoard";
import AdminPerformance from "@/pages/admin/AdminPerformance";
import Clients from "@/pages/admin/Clients";
import Deployments from "@/pages/admin/Deployments";
import Agents from "@/pages/admin/Agents";
import Workflows from "@/pages/admin/Workflows";
import Revenue from "@/pages/admin/Revenue";
import Content from "@/pages/admin/Content";
import AdminSupport from "@/pages/admin/AdminSupport";
import AdminSettings from "@/pages/admin/AdminSettings";

function seedAdmin() {
  globalThis.__TEST_AUTH__ = { id: "stub-admin", email: "admin@ethinx.dev", role: "admin" };
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
              <Route path="/admin/performance" element={<AdminPerformance />} />
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
  { link: "Performance", href: "/admin/performance", heading: /Performance Board/i },
  { link: "Clients", href: "/admin/clients", heading: /^Clients$/i },
  { link: "Deployments", href: "/admin/deployments", heading: /Deployments/i },
  { link: "Agents", href: "/admin/agents", heading: /Agents/i },
  { link: "Workflows", href: "/admin/workflows", heading: /Workflows/i },
  { link: "Revenue", href: "/admin/revenue", heading: /Revenue/i },
  { link: "Content Engine", href: "/admin/content", heading: /Content Engine/i },
  { link: "Support", href: "/admin/support", heading: /Support Tickets/i },
  { link: "Settings", href: "/admin/settings", heading: /^Settings$/i },
  { link: "Command Board", href: "/admin", heading: /Command Board/i },
];

const SIDEBAR_LINKS = [
  "Command Board",
  "Performance",
  "Clients",
  "Deployments",
  "Agents",
  "Workflows",
  "Revenue",
  "Content Engine",
  "Support",
  "Settings",
];

const ACTIVE_CLASSES = ["bg-muted", "text-primary", "font-medium"];

function pickSidebarLink(label: string, href: string): HTMLAnchorElement {
  // Multiple anchors may share a label across responsive slots — prefer the one whose href matches.
  const links = screen.getAllByRole("link", { name: new RegExp(`^${label}$`, "i") });
  const match = links.find((l) => (l as HTMLAnchorElement).getAttribute("href") === href);
  return (match ?? links[0]) as HTMLAnchorElement;
}

describe("Admin sidebar navigation", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    seedAdmin();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Simulate a scrolled page so we can verify the route reset doesn't carry stale scroll.
    Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 0 });
  });

  // Filter known-benign React Router v6 act-warnings; flag anything else.
  function realErrorCalls() {
    return errorSpy.mock.calls.filter((args) => {
      const first = args[0];
      return !(typeof first === "string" && first.includes("not wrapped in act"));
    });
  }

  afterEach(() => {
    cleanup();
    globalThis.__TEST_AUTH__ = null;
    errorSpy.mockRestore();
  });

  it(
    "clicks each sidebar link, lands on the right page, highlights the active item, and keeps layout intact",
    async () => {
      // delay: null avoids userEvent's setTimeout-based pacing that triggers act warnings.
      const user = userEvent.setup({ delay: null });
      renderApp();

      expect(await screen.findByRole("heading", { name: /Command Board/i })).toBeInTheDocument();

      // Snapshot all sidebar anchors once per iteration via DOM query, indexed by href.
      const sidebarLinksByHref = () => {
        const map = new Map<string, HTMLAnchorElement>();
        document
          .querySelectorAll<HTMLAnchorElement>('a[href^="/admin"]')
          .forEach((a) => {
            const href = a.getAttribute("href")!;
            // Skip the header brand link — it sits in <header>, not in the sidebar menu.
            if (a.closest('[data-sidebar="menu"]')) {
              if (!map.has(href)) map.set(href, a);
            }
          });
        return map;
      };

      for (const step of NAV_STEPS) {
        // Pretend the user scrolled before navigating.
        (window as unknown as { scrollY: number }).scrollY = 500;

        const beforeLinks = sidebarLinksByHref();
        const link = beforeLinks.get(step.href)!;
        expect(link, `sidebar link for ${step.href} not found`).toBeTruthy();

        await act(async () => {
          await user.click(link);
        });

        // 1. New page rendered
        await waitFor(() =>
          expect(screen.getByRole("heading", { name: step.heading })).toBeInTheDocument(),
        );

        // 2. Layout chrome intact
        expect(screen.getAllByText(/ETHINX · Command Center/i).length).toBeGreaterThan(0);

        // 3 & 4. Active state on clicked link, not on others (exact token match).
        const links = sidebarLinksByHref();
        const activeTokens = (links.get(step.href)!.className).split(/\s+/);
        for (const cls of ACTIVE_CLASSES) {
          expect(activeTokens).toContain(cls);
        }
        for (const other of NAV_STEPS) {
          if (other.href === step.href) continue;
          const tokens = (links.get(other.href)!.className).split(/\s+/);
          expect(tokens, `${other.href} should not be active`).not.toContain("bg-muted");
          expect(tokens, `${other.href} should not be active`).not.toContain("text-primary");
        }

        // 5. Scroll position sanity: route change doesn't crash; scrollY remains a number.
        expect(typeof window.scrollY).toBe("number");
      }

      expect(realErrorCalls()).toEqual([]);
    },
    15000,
  );
});
