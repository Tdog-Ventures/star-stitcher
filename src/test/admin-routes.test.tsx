import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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

function renderAt(path: string) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
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

const ROUTES: { path: string; heading: RegExp }[] = [
  { path: "/admin", heading: /Command Board/i },
  { path: "/admin/performance", heading: /Performance Board/i },
  { path: "/admin/clients", heading: /^Clients$/i },
  { path: "/admin/deployments", heading: /Deployments/i },
  { path: "/admin/agents", heading: /Agents/i },
  { path: "/admin/workflows", heading: /Workflows/i },
  { path: "/admin/revenue", heading: /Revenue/i },
  { path: "/admin/content", heading: /Content Engine/i },
  { path: "/admin/support", heading: /Support Tickets/i },
];

describe("Admin routes", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    seedAdmin();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    globalThis.__TEST_AUTH__ = null;
    errorSpy.mockRestore();
  });

  it.each(ROUTES)("renders %s with admin sidebar and no console errors", async ({ path, heading }) => {
    renderAt(path);

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();

    for (const label of SIDEBAR_LINKS) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    expect(screen.getAllByText(/ETHINX · Command Center/i).length).toBeGreaterThan(0);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
