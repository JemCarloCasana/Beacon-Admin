import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { fetchAdminMe, clearSession, getToken } from "@/api/adminMe";

import { adminLogout } from "@/api/adminAuth";
import { toast } from "sonner";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);

  const clearLocalSession = useCallback(() => {
    generation.current += 1;
    clearSession();
    setMe(null);
    setLoading(false);
    void queryClient.cancelQueries();
    queryClient.clear();
    navigate("/login", { replace: true });
  }, [navigate, queryClient]);

  const logout = useCallback(async () => {
    const token = getToken();
    generation.current += 1;
    try { if (token) await adminLogout(token); }
    catch { toast.error("Signed out locally. Signing out all devices was not confirmed; retry when connected."); }
    finally { clearLocalSession(); }
  }, [clearLocalSession]);

  const refreshMe = useCallback(async () => {
    const requestGeneration = ++generation.current;
    const token = getToken();
    setLoading(true);
    try {
      const data = await fetchAdminMe();
      if (requestGeneration !== generation.current || token !== getToken()) return null;
      setMe(data);
      return data;
    } catch (error) {
      if (requestGeneration !== generation.current || token !== getToken()) return null;
      if (error?.status === 401 || (error?.status === 403 && /deactivated/i.test(error.message))) clearLocalSession();
      throw error;
    } finally {
      if (requestGeneration === generation.current) setLoading(false);
    }
  }, [clearLocalSession]);

  useEffect(() => {
    window.addEventListener("auth:logout", clearLocalSession);
    return () => window.removeEventListener("auth:logout", clearLocalSession);
  }, [clearLocalSession]);

  useEffect(() => {
    if (getToken()) void refreshMe().catch(() => {});
    else { setMe(null); setLoading(false); }
    return () => { generation.current += 1; };
  }, [refreshMe]);

  const role = String(me?.role || "").toLowerCase();
  const permissions = useMemo(() => Array.isArray(me?.permissions) ? me.permissions : [], [me]);
  const value = useMemo(() => ({
    me, setMe, loading, permissions, role, refreshMe, logout,
    hasPermission: (permission) => permissions.includes(permission),
  }), [me, loading, permissions, role, refreshMe, logout]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error("useAdminAuth must be used inside <AdminAuthProvider>");
  return context;
}
