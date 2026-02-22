import { useMemo, useState } from "react";
import { useUsers } from "@/api";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { toAdminModel } from "@/models/admin.model";
import { toUserListModel } from "@/models/user.model";

/**
 * ViewController for Personnel Management page.
 */
export function useUsersController() {
  const [searchQuery, setSearchQuery] = useState("");
  const { me, loading, hasPermission } = useAdminAuth();
  const canManageUsers = hasPermission("manage_users");

  const usersQuery = useUsers({
    enabled: !loading && !!me && canManageUsers,
  });

  const users = useMemo(() => toUserListModel(usersQuery.data), [usersQuery.data]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;

    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(query) || user.full_name.toLowerCase().includes(query)
    );
  }, [searchQuery, users]);

  return {
    me: toAdminModel(me),
    loading,
    canManageUsers,
    searchQuery,
    users: filteredUsers,
    usersLoading: usersQuery.isLoading,
    usersError: usersQuery.isError ? usersQuery.error : null,
    actions: {
      setSearchQuery,
      refresh: usersQuery.refetch,
    },
  };
}

export default useUsersController;

