import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";

import DashboardOverview from "@/pages/dashboard/DashboardOverview";
import Engines from "@/pages/dashboard/Engines";
import OfferEngine from "@/pages/dashboard/OfferEngine";
import Assets from "@/pages/dashboard/Assets";
import Distribution from "@/pages/dashboard/Distribution";
import Settings from "@/pages/dashboard/Settings";

const STORAGE_KEY = "ethinx.auth.stub";

function seedMember() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ id: "stub-member", email: "member@ethinx.dev", role: "member" }),
  );
}

function renderAt(path: string) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route
              element={
                <ProtectedRoute requireRole="member">
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardOverview />} />
              <Route path="/engines" element={<Engines />} />
              <Route path="/engines/offer" element={<OfferEngine />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/distribution" element={<Distribution />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

const SIDEBAR_LINKS = [
  "Dashboard",
  "Engines",
  "Assets",
  "Distribution",
  "Settings",
];

const ROUTES: { path: string; heading: RegExp }[] = [
  { path: "/dashboard", heading: /^Dashboard$/i },
  { path: "/engines", heading: /^Engines$/i },
  { path: "/engines/offer", heading: /Offer Engine/i },
  { path: "/assets", heading: /^Assets$/i },
  { path: "/distribution", heading: /^Distribution$/i },
  { path: "/settings", heading: /^Settings$/i },
];

describe("Member workspace routes", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    seedMember();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    errorSpy.mockRestore();
  });

  it.each(ROUTES)("renders %s with sidebar and no console errors", async ({ path, heading }) => {
    renderAt(path);

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();

    for (const label of SIDEBAR_LINKS) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    expect(screen.getAllByText(/ETHINX · Workspace/i).length).toBeGreaterThan(0);

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
