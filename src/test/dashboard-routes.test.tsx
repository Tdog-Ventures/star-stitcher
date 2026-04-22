import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";

import DashboardOverview from "@/pages/dashboard/DashboardOverview";
import Curriculum from "@/pages/dashboard/Curriculum";
import Studio from "@/pages/dashboard/Studio";
import AdEngine from "@/pages/dashboard/AdEngine";
import Templates from "@/pages/dashboard/Templates";
import Community from "@/pages/dashboard/Community";
import Support from "@/pages/dashboard/Support";

// Seed the stub auth provider as a signed-in member before each render.
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
              <Route path="/dashboard/curriculum" element={<Curriculum />} />
              <Route path="/dashboard/studio" element={<Studio />} />
              <Route path="/dashboard/adengine" element={<AdEngine />} />
              <Route path="/dashboard/templates" element={<Templates />} />
              <Route path="/dashboard/community" element={<Community />} />
              <Route path="/dashboard/support" element={<Support />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

const SIDEBAR_LINKS = [
  "Overview",
  "Curriculum",
  "Neon Studio",
  "Ad Engine",
  "Email Templates",
  "Community",
  "Support",
];

const ROUTES: { path: string; heading: RegExp }[] = [
  { path: "/dashboard", heading: /Growth Hub/i },
  { path: "/dashboard/curriculum", heading: /Curriculum/i },
  { path: "/dashboard/studio", heading: /Neon Studio/i },
  { path: "/dashboard/adengine", heading: /Ad Engine/i },
  { path: "/dashboard/templates", heading: /Email Templates/i },
  { path: "/dashboard/community", heading: /Community/i },
  { path: "/dashboard/support", heading: /^Support$/i },
];

describe("Member dashboard routes", () => {
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

    // Page heading renders
    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();

    // Sidebar shows all member links (use getAllByText since responsive sidebar may render duplicates)
    for (const label of SIDEBAR_LINKS) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    // Header label
    expect(screen.getAllByText(/ETHINX · Member/i).length).toBeGreaterThan(0);

    // No React render errors logged
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
