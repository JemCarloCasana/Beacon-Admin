import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Incidents from "./pages/Incidents";
import LiveSOS from "./pages/LiveSOS";
import SafetyAlerts from "./pages/SafetyAlerts";
import MapView from "./pages/MapView";
import Users from "./pages/Users";
import AdminRequests from "./pages/AdminRequests";
import Reports from "./pages/Reports";
import Broadcasts from "./pages/Broadcasts";
import NotFound from "./pages/NotFound";

import ProtectedRoute from "@/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <SonnerToaster />

        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/login" element={<Navigate to="/" replace />} />

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

          <Route
            path="/admin-requests"
            element={
              <ProtectedRoute requiredPermission="manage_admins">
                <AdminRequests />
              </ProtectedRoute>
            }
          />

          <Route
            path="/broadcasts"
            element={
              <ProtectedRoute requiredPermission="manage_broadcasts">
                <Broadcasts />
              </ProtectedRoute>
            }
          />

          <Route
            path="/personnel"
            element={
              <ProtectedRoute requiredPermission="manage_users">
                <Users />
              </ProtectedRoute>
            }
          />

          <Route path="/settings" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

