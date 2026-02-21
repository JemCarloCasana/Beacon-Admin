import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";

// Pages
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Incidents from "./pages/Incidents";
import LiveSOS from "./pages/LiveSOS";
import SafetyAlerts from "./pages/SafetyAlerts";
import MapView from "./pages/MapView";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

// Protection
import ProtectedRoute from "@/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <SonnerToaster />

        <Routes>
          {/* Auth page */}
          <Route path="/" element={<Auth />} />

          {/* Optional: if someone hits /login, send to / */}
          <Route path="/login" element={<Navigate to="/" replace />} />

          {/* Authenticated routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/incidents"
            element={
              <ProtectedRoute>
                <Incidents />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sos"
            element={
              <ProtectedRoute>
                <LiveSOS />
              </ProtectedRoute>
            }
          />

          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <SafetyAlerts />
              </ProtectedRoute>
            }
          />

          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <MapView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* ✅ Permission-protected route: Users requires manage_users */}
          <Route
  path="/personnel"
  element={
    <ProtectedRoute requiredPermission="manage_users">
      <Users />
    </ProtectedRoute>
  }
/>


          {/* ✅ Settings removed (you said it will be deleted)
              If you still have Settings page file, keep this redirect to avoid 404s: */}
          <Route path="/settings" element={<Navigate to="/dashboard" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
