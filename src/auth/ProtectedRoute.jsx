import { Link, Navigate } from "react-router-dom";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { Button } from "@/components/ui/button";

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

/**
 * An account that holds no permissions at all.
 *
 * Such an account signs in successfully - login checks no permissions -
 * and is then refused by every protected route. Landing on a page whose
 * every panel 403s looks like a broken app. Say what is actually true:
 * this account has no console access, and an administrator has to grant
 * it before there is anything to open.
 */
function NoConsoleAccess() {
  const { me, logout } = useAdminAuth();
  const who = me?.full_name || me?.email || "This account";

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-xl font-semibold text-foreground">This account has no console access</h1>
        <p className="text-sm text-muted-foreground">
          {who} is signed in, but it holds no permissions, so there is nothing in the
          console it is allowed to open.
        </p>
        <p className="text-sm text-muted-foreground">
          Ask an administrator with manage_admins to grant permissions to this account.
        </p>
        <Button variant="outline" onClick={() => logout?.()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, requiredPermission, requiredPermissions }) {
  const { me, loading, hasPermission } = useAdminAuth();

  if (loading) return null;
  if (!me) return <Navigate to="/login" replace />;

  // An account with no permissions cannot use any screen, so say that
  // once, plainly, rather than letting it land on a page where every
  // panel fails.
  if (Array.isArray(me.permissions) && me.permissions.length === 0) {
    return <NoConsoleAccess />;
  }

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
