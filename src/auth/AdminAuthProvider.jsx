import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAdminMe, clearSession } from "@/api/adminMe";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch /admin/me once for the whole app
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await fetchAdminMe(); // must send Bearer token internally
        if (!mounted) return;
        setMe(data);
      } catch (e) {
        // token missing/expired -> clear and return to auth
        if (!mounted) return;
        clearSession();
        setMe(null);
        navigate("/", { replace: true }); // adjust if your auth route differs
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const role = useMemo(() => String(me?.role || "").toLowerCase(), [me]);
  const permissions = useMemo(() => {
    const basePermissions = Array.isArray(me?.permissions) ? me.permissions : [];

    if (role !== "admin") return basePermissions;

    return Array.from(
      new Set([
        ...basePermissions,
        "manage_admins",
        "manage_users",
      ])
    );
  }, [me, role]);

  const refreshMe = useCallback(async () => {
    try {
      const data = await fetchAdminMe();
      setMe(data);
      return data;
    } catch (e) {
      clearSession();
      setMe(null);
      navigate("/", { replace: true });
      throw e;
    }
  }, [navigate]);

  const value = useMemo(
    () => ({
      me,
      setMe,
      loading,
      permissions,
      role,
      refreshMe,
      // helpers
      hasPermission: (p) => (role === "admin" ? true : permissions.includes(p)),
      logout: () => {
        clearSession();
        setMe(null);
        navigate("/", { replace: true });
      },
    }),
    [me, loading, permissions, role, navigate, refreshMe]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside <AdminAuthProvider>");
  return ctx;
}
