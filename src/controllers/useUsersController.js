import { useMemo, useState } from "react";
import { useUsers } from "@/api";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { toAdminModel } from "@/models/admin.model";
import { toUserListModel } from "@/models/user.model";
import { useToast } from "@/hooks/use-toast";
import { sendAdminRequest } from "@/api/adminRequests";

/**
 * ViewController for Personnel Management page.
 */
export function useUsersController() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingAdminRequestId, setSendingAdminRequestId] = useState(null);
  const { me, loading, hasPermission } = useAdminAuth();
  const { toast } = useToast();
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

  const onSendAdminRequest = async (user) => {
    if (!user?.id) return;
    if (user?.role?.toLowerCase() === "admin") {
      toast({
        title: "Already an admin",
        description: `${user.full_name} already has admin access.`,
      });
      return;
    }

    try {
      setSendingAdminRequestId(user.id);
      await sendAdminRequest({ personnelId: user.id });
      toast({
        title: "Admin request sent",
        description: `An admin invitation was sent to ${user.full_name}.`,
      });
      usersQuery.refetch();
    } catch (error) {
      toast({
        title: "Failed to send request",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingAdminRequestId(null);
    }
  };

  return {
    me: toAdminModel(me),
    loading,
    canManageUsers,
    searchQuery,
    users: filteredUsers,
    usersLoading: usersQuery.isLoading,
    usersError: usersQuery.isError ? usersQuery.error : null,
    sendingAdminRequestId,
    actions: {
      setSearchQuery,
      refresh: usersQuery.refetch,
      onSendAdminRequest,
      onEditUser: () => {},
      onDeleteUser: () => {},
    },
  };
}

export default useUsersController;
