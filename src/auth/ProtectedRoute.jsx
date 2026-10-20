import { Navigate } from "react-router-dom";
import { useAdminAuth } from "@/auth/AdminAuthProvider";

export default function ProtectedRoute({ children, requiredPermission, requiredPermissions }) {
  const { me, loading, hasPermission } = useAdminAuth();

  if (loading) return null;
  if (!me) return <Navigate to="/login" replace />;

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredPermissions && !requiredPermissions.some(hasPermission)) return <Navigate to="/dashboard" replace />;
  return children;
}
