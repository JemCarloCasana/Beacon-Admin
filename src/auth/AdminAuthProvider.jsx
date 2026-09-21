import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { fetchAdminMe, clearSession, getToken } from "@/api/adminMe";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);

  const logout = useCallback(() => {
    generation.current += 1;
    clearSession();
    setMe(null);
    setLoading(false);
    void queryClient.cancelQueries();
    queryClient.clear();
    navigate("/login", { replace: true });
  }, [navigate, queryClient]);

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
      logout();
      throw error;
    } finally {
      if (requestGeneration === generation.current) setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    window.addEventListener("auth:logout", logout);
    return () => window.removeEventListener("auth:logout", logout);
  }, [logout]);

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
