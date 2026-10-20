import { Link, Navigate } from "react-router-dom";
import { useAdminAuth } from "@/auth/AdminAuthProvider";

/**
 * A page the operator is not allowed to see.
 *
 * This used to be a silent <Navigate to="/dashboard" />, which meant an
 * operator whose permissions did not cover a page simply landed on the
 * dashboard with no idea why the map - or the SOS screen - would not open.
 * Say what is missing and who can grant it.
 */
function AccessDenied({ required }) {
  const { me } = useAdminAuth();
  const permissionList = Array.isArray(required) ? required : [required].filter(Boolean);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-xl font-semibold text-foreground">You do not have access to this page</h1>
        <p className="text-sm text-muted-foreground">
          {permissionList.length > 1
            ? "It needs one of these permissions:"
            : "It needs this permission:"}
        </p>
        <ul className="flex flex-wrap justify-center gap-2">
          {permissionList.map((permission) => (
            <li
              key={permission}
              className="rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-xs text-foreground"
            >
              {permission}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          {me?.role === "admin"
            ? "Ask an administrator with manage_admins to grant it."
            : "Ask your administrator to grant it."}
        </p>
        <Link
          to="/dashboard"
          className="inline-block text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, requiredPermission, requiredPermissions }) {
  const { me, loading, hasPermission } = useAdminAuth();

  if (loading) return null;
  if (!me) return <Navigate to="/login" replace />;

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <AccessDenied required={requiredPermission} />;
  }

  // A list of required permissions means ANY ONE of them. The map is
  // deliberately usable with partial access - useMapController gates each
  // layer separately - so this must not become "all of".
  if (requiredPermissions && !requiredPermissions.some(hasPermission)) {
    return <AccessDenied required={requiredPermissions} />;
  }
  return children;
}
