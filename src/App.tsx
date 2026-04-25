import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { PublicLayout } from "@/components/layouts/PublicLayout";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { AdminLayout } from "@/components/layouts/AdminLayout";

// Public pages — kept eager because they are the marketing entry points
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Public (marketing/showcase layer) — lazy
const Showcase = lazy(() => import("./pages/public/Showcase"));
const Partners = lazy(() => import("./pages/public/Partners"));
const VideoVelocity = lazy(() => import("./pages/public/VideoVelocity"));
const Onboarding = lazy(() => import("./pages/public/Onboarding"));

// Auth — lazy
const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));

// Member workspace — lazy (heavy: distribution calendar, offer history)
const DashboardOverview = lazy(() => import("./pages/dashboard/DashboardOverview"));
const Engines = lazy(() => import("./pages/dashboard/Engines"));
const OfferEngine = lazy(() => import("./pages/dashboard/OfferEngine"));
const VideoForge = lazy(() => import("./pages/dashboard/VideoForge"));
const CreatorBlueprint = lazy(() => import("./pages/dashboard/CreatorBlueprint"));
const CreatorLaunchpad = lazy(() => import("./pages/dashboard/CreatorLaunchpad"));
const NeonStudio = lazy(() => import("./pages/dashboard/NeonStudio"));
const VideoVelocityEngine = lazy(() => import("./pages/dashboard/VideoVelocity"));
const PartnerProgram = lazy(() => import("./pages/dashboard/PartnerProgram"));
const GrowthHub = lazy(() => import("./pages/dashboard/GrowthHub"));
const ShowcaseEngine = lazy(() => import("./pages/dashboard/ShowcaseEngine"));
const OfferHistory = lazy(() => import("./pages/dashboard/OfferHistory"));
const Assets = lazy(() => import("./pages/dashboard/Assets"));
const GeneratedVideos = lazy(() => import("./pages/dashboard/GeneratedVideos"));
const Distribution = lazy(() => import("./pages/dashboard/Distribution"));
const DistributionCalendar = lazy(() => import("./pages/dashboard/DistributionCalendar"));
const Settings = lazy(() => import("./pages/dashboard/Settings"));
const SettingsAccount = lazy(() => import("./pages/dashboard/SettingsAccount"));
const SettingsWorkspace = lazy(() => import("./pages/dashboard/SettingsWorkspace"));

// Admin (Command Center) — lazy (heavy: performance board, command board)
const CommandBoard = lazy(() => import("./pages/admin/CommandBoard"));
const AdminPerformance = lazy(() => import("./pages/admin/AdminPerformance"));
const Clients = lazy(() => import("./pages/admin/Clients"));
const Deployments = lazy(() => import("./pages/admin/Deployments"));
const Agents = lazy(() => import("./pages/admin/Agents"));
const Workflows = lazy(() => import("./pages/admin/Workflows"));
const Revenue = lazy(() => import("./pages/admin/Revenue"));
const Content = lazy(() => import("./pages/admin/Content"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div
          className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
          aria-hidden="true"
        />
        <span>Loading…</span>
      </div>
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                {/* Public routes (with public navbar) */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/showcase" element={<Showcase />} />
                  <Route path="/partners" element={<Partners />} />
                  <Route path="/video-velocity" element={<VideoVelocity />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                </Route>

                {/* Auth routes (no navbar/sidebar) */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Member workspace (Offer + Distribution Engine) */}
                <Route
                  element={
                    <ProtectedRoute requireRole="member">
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<DashboardOverview />} />
                  <Route path="/engines" element={<Engines />} />
                  <Route path="/engines/video-forge" element={<VideoForge />} />
                  <Route path="/engines/creator-blueprint" element={<CreatorBlueprint />} />
                  <Route path="/engines/creator-launchpad" element={<CreatorLaunchpad />} />
                  <Route path="/engines/neon-studio" element={<NeonStudio />} />
                  <Route path="/engines/video-velocity" element={<VideoVelocityEngine />} />
                  <Route path="/engines/partner-program" element={<PartnerProgram />} />
                  <Route path="/engines/growth-hub" element={<GrowthHub />} />
                  <Route path="/engines/showcase" element={<ShowcaseEngine />} />
                  <Route path="/engines/offer" element={<OfferEngine />} />
                  <Route path="/engines/offer/history" element={<OfferHistory />} />
                  <Route path="/assets" element={<Assets />} />
                  <Route path="/videos" element={<GeneratedVideos />} />
                  <Route path="/distribution" element={<Distribution />} />
                  <Route path="/distribution/calendar" element={<DistributionCalendar />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/account" element={<SettingsAccount />} />
                  <Route path="/settings/workspace" element={<SettingsWorkspace />} />
                </Route>

                {/* Admin command center */}
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

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
