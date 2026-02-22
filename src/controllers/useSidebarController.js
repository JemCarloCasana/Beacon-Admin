import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { NAV_ITEMS } from "@/config/constants";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { toAdminModel } from "@/models/admin.model";

/**
 * ViewController for sidebar navigation + profile.
 */
export function useSidebarController() {
  const location = useLocation();
  const { me, loading, hasPermission } = useAdminAuth();

  const admin = useMemo(() => toAdminModel(me), [me]);

  const visibleNavItems = useMemo(() => {
    return (NAV_ITEMS || [])
      .map((group) => {
        const items = (group.items || []).filter((item) => {
          if (!item.requiredPermission) return true;
          if (loading) return false;
          return hasPermission(item.requiredPermission);
        });

        return {
          category: group.category || "misc",
          items,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [hasPermission, loading]);

  return {
    pathname: location.pathname,
    visibleNavItems,
    profile: {
      initials: admin?.full_name?.slice(0, 2)?.toUpperCase() || "OP",
      fullName: admin?.full_name || "Operator",
      role: admin?.role || "",
    },
  };
}

export default useSidebarController;

