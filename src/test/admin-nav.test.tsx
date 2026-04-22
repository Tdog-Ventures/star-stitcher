import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
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

// Each entry: sidebar link label → expected page heading after navigation.
const NAV_STEPS: { link: string; heading: RegExp }[] = [
  { link: "Clients", heading: /^Clients$/i },
  { link: "Deployments", heading: /Deployments/i },
  { link: "Agents", heading: /Agents/i },
  { link: "Workflows", heading: /Workflows/i },
  { link: "Revenue", heading: /Revenue/i },
  { link: "Content Engine", heading: /Content Engine/i },
  { link: "Support", heading: /Support Tickets/i },
  { link: "Settings", heading: /^Settings$/i },
  { link: "Command Board", heading: /Command Board/i },
];

const SIDEBAR_LINKS = [
  "Command Board",
  "Clients",
  "Deployments",
  "Agents",
  "Workflows",
  "Revenue",
  "Content Engine",
  "Support",
  "Settings",
];

describe("Admin sidebar navigation", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    seedAdmin();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    errorSpy.mockRestore();
  });

  it("clicks each sidebar link and lands on the correct page with layout intact", async () => {
    const user = userEvent.setup();
    renderApp();

    // Starts on Command Board
    expect(await screen.findByRole("heading", { name: /Command Board/i })).toBeInTheDocument();

    for (const step of NAV_STEPS) {
      // The sidebar may render the label text in multiple slots (mobile sheet + desktop rail);
      // pick the first <a> that points to the matching href.
      const links = screen.getAllByRole("link", { name: new RegExp(`^${step.link}$`, "i") });
      expect(links.length).toBeGreaterThan(0);

      await user.click(links[0]);

      // Page heading updates to the new route
      await waitFor(() =>
        expect(screen.getByRole("heading", { name: step.heading })).toBeInTheDocument(),
      );

      // Layout chrome still intact: header label + every sidebar link still present
      expect(screen.getAllByText(/ETHINX · Command Center/i).length).toBeGreaterThan(0);
      for (const label of SIDEBAR_LINKS) {
        expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      }
    }

    // No React render errors throughout the whole navigation sequence
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
