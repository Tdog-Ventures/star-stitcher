import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ScrollToTop } from "@/components/ScrollToTop";

import { PublicLayout } from "@/components/layouts/PublicLayout";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { AdminLayout } from "@/components/layouts/AdminLayout";

// Public (marketing/showcase layer — preserved from the stitch)
import Index from "./pages/Index";
import Showcase from "./pages/public/Showcase";
import Partners from "./pages/public/Partners";
import VideoVelocity from "./pages/public/VideoVelocity";
import Onboarding from "./pages/public/Onboarding";

// Auth
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// Member workspace — Offer + Distribution Engine
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import Engines from "./pages/dashboard/Engines";
import OfferEngine from "./pages/dashboard/OfferEngine";
import OfferHistory from "./pages/dashboard/OfferHistory";
import Assets from "./pages/dashboard/Assets";
import Distribution from "./pages/dashboard/Distribution";
import DistributionCalendar from "./pages/dashboard/DistributionCalendar";
import Settings from "./pages/dashboard/Settings";

// Admin (Command Center — preserved from the stitch)
import CommandBoard from "./pages/admin/CommandBoard";
import AdminPerformance from "./pages/admin/AdminPerformance";
import Clients from "./pages/admin/Clients";
import Deployments from "./pages/admin/Deployments";
import Agents from "./pages/admin/Agents";
import Workflows from "./pages/admin/Workflows";
import Revenue from "./pages/admin/Revenue";
import Content from "./pages/admin/Content";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminSettings from "./pages/admin/AdminSettings";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
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
                <Route path="/engines/offer" element={<OfferEngine />} />
                <Route path="/engines/offer/history" element={<OfferHistory />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/distribution" element={<Distribution />} />
                <Route path="/distribution/calendar" element={<DistributionCalendar />} />
                <Route path="/settings" element={<Settings />} />
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
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
