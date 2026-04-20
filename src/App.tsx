import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import { PublicLayout } from "@/components/layouts/PublicLayout";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { AdminLayout } from "@/components/layouts/AdminLayout";

// Public
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

// Member
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import Curriculum from "./pages/dashboard/Curriculum";
import Studio from "./pages/dashboard/Studio";
import AdEngine from "./pages/dashboard/AdEngine";
import Templates from "./pages/dashboard/Templates";
import Community from "./pages/dashboard/Community";
import Support from "./pages/dashboard/Support";

// Admin
import CommandBoard from "./pages/admin/CommandBoard";
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

              {/* Member dashboard */}
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
