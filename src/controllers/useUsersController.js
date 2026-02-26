import { useMemo, useState } from "react";
import { useUsers } from "@/api";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { toAdminModel } from "@/models/admin.model";
import { toUserListModel } from "@/models/user.model";
import { useToast } from "@/hooks/use-toast";
import { sendAdminRequest } from "@/api/adminRequests";
import { apiDelete, apiPatch } from "@/services/api";

async function deleteUserById(userId) {
  const candidateEndpoints = [
    `/admin/admins/${userId}`,
    `/admin/users/${userId}`,
    `/admin/personnel/${userId}`,
  ];

  let lastError = null;
  for (const endpoint of candidateEndpoints) {
    try {
      await apiDelete(endpoint);
      return;
    } catch (error) {
      lastError = error;
      if (error?.status === 404 || error?.status === 405) continue;
      throw error;
    }
  }

  throw lastError || new Error("Failed to delete user.");
}

async function updateUserById(userId, { full_name, email }) {
  const candidateEndpoints = [
    `/admin/admins/${userId}`,
    `/admin/users/${userId}`,
    `/admin/personnel/${userId}`,
  ];

  const payloads = [
    { full_name, email },
    { fullName: full_name, email },
    { name: full_name, email },
  ];

  let lastError = null;
  for (const endpoint of candidateEndpoints) {
    for (const payload of payloads) {
      try {
        await apiPatch(endpoint, payload);
        return;
      } catch (error) {
        lastError = error;
        if (error?.status === 404 || error?.status === 405 || error?.status === 422) continue;
        throw error;
      }
    }
  }

  throw lastError || new Error("Failed to update user.");
}

/**
 * ViewController for Personnel Management page.
 */
export function useUsersController() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingAdminRequestId, setSendingAdminRequestId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    full_name: "",
    email: "",
  });
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

  const onDeleteUser = async (user) => {
    if (!user?.id) return;
    if (String(user.id) === String(me?.id)) {
      toast({
        title: "Cannot delete your own account",
        description: "Use another admin account to remove this user.",
        variant: "destructive",
      });
      return;
    }

    const userLabel = user.full_name || user.email || `User #${user.id}`;
    const isConfirmed = window.confirm(`Delete ${userLabel}? This action cannot be undone.`);
    if (!isConfirmed) return;

    try {
      setDeletingUserId(user.id);
      await deleteUserById(user.id);
      toast({
        title: "User deleted",
        description: `${userLabel} has been removed.`,
      });
      await usersQuery.refetch();
    } catch (error) {
      toast({
        title: "Failed to delete user",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const onEditUser = async (user) => {
    if (!user?.id) return;
    setEditForm({
      id: user.id,
      full_name: String(user.full_name || ""),
      email: String(user.email || ""),
    });
    setIsEditDialogOpen(true);
  };

  const onEditDialogOpenChange = (open) => {
    if (editingUserId) return;
    setIsEditDialogOpen(Boolean(open));
  };

  const onEditFormChange = (field, value) => {
    if (field !== "full_name" && field !== "email") return;
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const onCancelEditUser = () => {
    if (editingUserId) return;
    setIsEditDialogOpen(false);
  };

  const onSaveEditedUser = async () => {
    if (!editForm?.id) return;

    const originalUser = users.find((user) => String(user.id) === String(editForm.id));
    const currentName = String(originalUser?.full_name || "").trim();
    const currentEmail = String(originalUser?.email || "").trim();
    const nextName = String(editForm.full_name || "").trim();
    const nextEmail = String(editForm.email || "").trim();

    if (!nextName) {
      toast({
        title: "Invalid full name",
        description: "Full name is required.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(nextEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (nextName === currentName && nextEmail === currentEmail) return;

    try {
      setEditingUserId(editForm.id);
      await updateUserById(editForm.id, { full_name: nextName, email: nextEmail });
      toast({
        title: "User updated",
        description: `${nextName} was updated successfully.`,
      });
      await usersQuery.refetch();
      setIsEditDialogOpen(false);
    } catch (error) {
      toast({
        title: "Failed to update user",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setEditingUserId(null);
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
    deletingUserId,
    editingUserId,
    isEditDialogOpen,
    editForm,
    actions: {
      setSearchQuery,
      refresh: usersQuery.refetch,
      onSendAdminRequest,
      onEditUser,
      onEditDialogOpenChange,
      onEditFormChange,
      onCancelEditUser,
      onSaveEditedUser,
      onDeleteUser,
    },
  };
}

export default useUsersController;
