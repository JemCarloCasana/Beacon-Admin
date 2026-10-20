import { Navigate } from "react-router-dom";
import { useAdminAuth } from "@/auth/AdminAuthProvider";

export default function ProtectedRoute({ children, requiredPermission, requiredPermissions }) {
  const { me, loading, hasPermission } = useAdminAuth();

  if (loading) return null;
  if (!me) return <Navigate to="/login" replace />;

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  // A list of required permissions means ANY ONE of them. The map is
  // deliberately usable with partial access - useMapController gates each
  // layer separately - so this must not become "all of".
  if (requiredPermissions && !requiredPermissions.some(hasPermission)) return <Navigate to="/dashboard" replace />;
  return children;
}
