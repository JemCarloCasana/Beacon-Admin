import { useMemo, useState } from "react";
import { useUsers } from "@/api";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { toAdminModel } from "@/models/admin.model";
import { toUserListModel } from "@/models/user.model";
import { useToast } from "@/hooks/use-toast";
import { sendAdminRequest } from "@/api/adminRequests";
import { apiPatch } from "@/services/api";
import { updateUserStatus } from "@/api/useUsers";

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

function getStatusMutationErrorDescription(error) {
  if (Number(error?.status) === 409) {
    return error?.data?.message || error?.message || "Only personnel accounts can be deactivated/reactivated";
  }
  return "Please try again.";
}

function getStatusTargetId(user) {
  const candidate = user?.statusTargetId ?? user?.id;
  if (candidate === null || candidate === undefined) return null;
  if (typeof candidate === "string" && candidate.trim() === "") return null;
  return candidate;
}

/**
 * ViewController for Personnel Management page.
 */
export function useUsersController() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sendingAdminRequestId, setSendingAdminRequestId] = useState(null);
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState(null);
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
    status: statusFilter,
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
    if (user?.status === "deactivated") {
      toast({
        title: "User is deactivated",
        description: "Reactivate this account first before sending an admin request.",
        variant: "destructive",
      });
      return;
    }
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

  const onDeactivateUser = async (user) => {
    const targetId = getStatusTargetId(user);
    if (!targetId) {
      toast({
        title: "Cannot update user status",
        description: "Missing user identifier for status update.",
        variant: "destructive",
      });
      return;
    }
    if (user?.status === "deactivated") return;
    if (String(user.id) === String(me?.id)) {
      toast({
        title: "Cannot deactivate your own account",
        description: "Use another admin account to deactivate this user.",
        variant: "destructive",
      });
      return;
    }

    const userLabel = user.full_name || user.email || `User #${user.id}`;
    const isConfirmed = window.confirm(`Deactivate ${userLabel}?`);
    if (!isConfirmed) return;

    try {
      setStatusUpdatingUserId(user.id ?? targetId);
      await updateUserStatus(targetId, "deactivated");
      toast({
        title: "User deactivated",
        description: `${userLabel} has been deactivated.`,
      });
      await usersQuery.refetch();
    } catch (error) {
      toast({
        title: "Failed to deactivate user",
        description: getStatusMutationErrorDescription(error),
        variant: "destructive",
      });
    } finally {
      setStatusUpdatingUserId(null);
    }
  };

  const onReactivateUser = async (user) => {
    const targetId = getStatusTargetId(user);
    if (!targetId) {
      toast({
        title: "Cannot update user status",
        description: "Missing user identifier for status update.",
        variant: "destructive",
      });
      return;
    }
    if (user?.status !== "deactivated") return;

    const userLabel = user.full_name || user.email || `User #${user.id}`;
    const isConfirmed = window.confirm(`Reactivate ${userLabel}?`);
    if (!isConfirmed) return;

    try {
      setStatusUpdatingUserId(user.id ?? targetId);
      await updateUserStatus(targetId, "active");
      toast({
        title: "User reactivated",
        description: `${userLabel} has been reactivated.`,
      });
      await usersQuery.refetch();
    } catch (error) {
      toast({
        title: "Failed to reactivate user",
        description: getStatusMutationErrorDescription(error),
        variant: "destructive",
      });
    } finally {
      setStatusUpdatingUserId(null);
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
    statusFilter,
    users: filteredUsers,
    usersLoading: usersQuery.isLoading,
    usersError: usersQuery.isError ? usersQuery.error : null,
    sendingAdminRequestId,
    statusUpdatingUserId,
    editingUserId,
    isEditDialogOpen,
    editForm,
    actions: {
      setSearchQuery,
      setStatusFilter,
      refresh: usersQuery.refetch,
      onSendAdminRequest,
      onEditUser,
      onEditDialogOpenChange,
      onEditFormChange,
      onCancelEditUser,
      onSaveEditedUser,
      onDeactivateUser,
      onReactivateUser,
    },
  };
}

export default useUsersController;
