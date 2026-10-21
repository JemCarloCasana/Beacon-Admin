import { useMemo, useState } from "react";
import { useUsers } from "@/api";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { toAdminModel } from "@/models/admin.model";
import { toUserListModel } from "@/models/user.model";
import { useToast } from "@/hooks/use-toast";
import { sendAdminRequest } from "@/api/adminRequests";
import { apiPatch } from "@/services/api";
import { createUser, updateUserStatus } from "@/api/useUsers";
import { normalizeEmail, normalizeName, validateSignup } from "@/auth/validation";
import { rolePermissionPreset } from "@/config/permissions";

/**
 * Do two permission lists describe the same grant? Order does not
 * matter - a grant is a set.
 */
function samePermissionSet(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  const a = left.map((item) => String(item)).sort();
  const b = right.map((item) => String(item)).sort();
  return a.every((item, index) => item === b[index]);
}

async function updateUserById(userId, { full_name, email, permissions }) {
  // PATCH /admin/admins/:id is the only route that can write an admin
  // account's name, email or permissions: the other two candidates
  // reject the permissions field, and their name-and-email branch
  // writes the public user profiles collection rather than the account.
  // So a permissions-bearing save goes there and nowhere else.
  if (Array.isArray(permissions)) {
    return apiPatch(`/admin/admins/${userId}`, { full_name, email, permissions });
  }

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

function getCreateUserErrorDescription(error) {
  if (Number(error?.status) === 409) {
    return error?.data?.message || error?.message || "An account with this email already exists.";
  }
  if (Number(error?.status) === 422) {
    return error?.data?.message || error?.message || "Please review the entered details and try again.";
  }
  return error?.message || "Please try again.";
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
  const initialCreateForm = {
    full_name: "",
    email: "",
    password: "",
    role: "personnel",
    permissions: rolePermissionPreset("personnel"),
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sendingAdminRequestId, setSendingAdminRequestId] = useState(null);
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [editForm, setEditForm] = useState({
    id: null,
    full_name: "",
    email: "",
    permissions: [],
  });
  const { me, loading, hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const canManageUsers = hasPermission("manage_users");
  const canCreateUsers = hasPermission("manage_admins");
  const canManageAdmins = hasPermission("manage_admins");

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
      permissions: Array.isArray(user.permissions) ? [...user.permissions] : [],
    });
    setIsEditDialogOpen(true);
  };

  const onEditDialogOpenChange = (open) => {
    if (editingUserId) return;
    setIsEditDialogOpen(Boolean(open));
  };

  const onOpenCreateUser = () => {
    if (!canCreateUsers) {
      toast({
        title: "You do not have permission",
        description: "Only admins with manage admin access can create accounts.",
        variant: "destructive",
      });
      return;
    }
    setIsCreateDialogOpen(true);
  };

  const onCreateDialogOpenChange = (open) => {
    if (creatingUser) return;
    setIsCreateDialogOpen(Boolean(open));
    if (!open) {
      setCreateForm(initialCreateForm);
    }
  };

  const onCreateFormChange = (field, value) => {
    if (!["full_name", "email", "password", "role", "permissions"].includes(field)) return;
    setCreateForm((prev) => {
      // A new role means a new grant: re-grant the preset for it, so
      // the account cannot inherit the previous role's permissions.
      if (field === "role") {
        return { ...prev, role: value, permissions: rolePermissionPreset(value) };
      }
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const onCancelCreateUser = () => {
    if (creatingUser) return;
    setIsCreateDialogOpen(false);
    setCreateForm(initialCreateForm);
  };

  const onCreateUser = async () => {
    if (!canCreateUsers) {
      toast({
        title: "You do not have permission",
        description: "Only admins with manage admin access can create accounts.",
        variant: "destructive",
      });
      return;
    }

    const normalizedName = normalizeName(createForm.full_name);
    const normalizedEmail = normalizeEmail(createForm.email);
    const normalizedPassword = String(createForm.password ?? "");
    const normalizedRole = String(createForm.role || "").trim().toLowerCase();
    const validationErrors = validateSignup({
      full_name: normalizedName,
      email: normalizedEmail,
      password: normalizedPassword,
    });

    if (!["personnel", "admin"].includes(normalizedRole)) {
      toast({
        title: "Invalid role",
        description: "Please select either personnel or admin.",
        variant: "destructive",
      });
      return;
    }

    const firstError = validationErrors.full_name || validationErrors.email || validationErrors.password;
    if (firstError) {
      toast({
        title: "Invalid user details",
        description: firstError,
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatingUser(true);
      await createUser({
        full_name: normalizedName,
        email: normalizedEmail,
        password: normalizedPassword,
        role: normalizedRole,
        permissions: Array.isArray(createForm.permissions) ? createForm.permissions : [],
      });
      toast({
        title: "User created",
        description: `${normalizedName} was added successfully.`,
      });
      await usersQuery.refetch();
      setCreateForm(initialCreateForm);
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast({
        title: "Failed to create user",
        description: getCreateUserErrorDescription(error),
        variant: "destructive",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const onEditFormChange = (field, value) => {
    if (!["full_name", "email", "permissions"].includes(field)) return;
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
    const originalPermissions = Array.isArray(originalUser?.permissions)
      ? originalUser.permissions
      : [];
    const nextPermissions = Array.isArray(editForm.permissions) ? editForm.permissions : [];
    const permissionsChanged = !samePermissionSet(originalPermissions, nextPermissions);

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

    if (nextName === currentName && nextEmail === currentEmail && !permissionsChanged) return;

    // The backend refuses a permissions key on your own account even
    // when the value is unchanged, which would fail the whole save. So
    // the grant is sent only when it actually changed, and never for
    // the signed-in operator's own row.
    const isSelf = String(editForm.id) === String(me?.id);
    const payload = { full_name: nextName, email: nextEmail };
    if (permissionsChanged && !isSelf) {
      payload.permissions = nextPermissions;
    }

    try {
      setEditingUserId(editForm.id);
      await updateUserById(editForm.id, payload);
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
    canCreateUsers,
    canManageAdmins,
    searchQuery,
    statusFilter,
    users: filteredUsers,
    usersTotal: users.length,
    usersLoading: usersQuery.isLoading,
    usersError: usersQuery.isError ? usersQuery.error : null,
    sendingAdminRequestId,
    statusUpdatingUserId,
    creatingUser,
    editingUserId,
    isCreateDialogOpen,
    isEditDialogOpen,
    createForm,
    editForm,
    actions: {
      setSearchQuery,
      setStatusFilter,
      refresh: usersQuery.refetch,
      onSendAdminRequest,
      onOpenCreateUser,
      onCreateDialogOpenChange,
      onCreateFormChange,
      onCancelCreateUser,
      onCreateUser,
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
