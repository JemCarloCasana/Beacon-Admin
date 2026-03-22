import { act, renderHook, waitFor } from "@testing-library/react";
import { useUsersController } from "@/controllers/useUsersController";
import { useUsers } from "@/api";
import { createUser, updateUserStatus } from "@/api/useUsers";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { useToast } from "@/hooks/use-toast";

const toast = vi.fn();

vi.mock("@/api", () => ({
  useUsers: vi.fn(),
}));

vi.mock("@/api/useUsers", () => ({
  createUser: vi.fn(),
  updateUserStatus: vi.fn(),
}));

vi.mock("@/auth/AdminAuthProvider", () => ({
  useAdminAuth: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(),
}));

vi.mock("@/api/adminRequests", () => ({
  sendAdminRequest: vi.fn(),
}));

describe("useUsersController", () => {
  let confirmSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ toast });
    useAdminAuth.mockReturnValue({
      me: { id: 77, full_name: "Root Admin", email: "root@example.com", role: "admin" },
      loading: false,
      hasPermission: vi.fn(() => true),
    });
    useUsers.mockReturnValue({
      data: [
        { id: 11, full_name: "Personnel A", email: "a@example.com", role: "personnel", status: "active" },
        { id: 12, full_name: "Personnel B", email: "b@example.com", role: "personnel", status: "deactivated" },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({}),
    });
    createUser.mockResolvedValue({ id: 99 });
    updateUserStatus.mockResolvedValue({ ok: true });
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy?.mockRestore();
  });

  it("defaults status filter to all and passes it to useUsers", () => {
    const { result } = renderHook(() => useUsersController());

    expect(result.current.statusFilter).toBe("all");
    expect(useUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "all",
      })
    );
  });

  it("deactivates user via status patch", async () => {
    const { result } = renderHook(() => useUsersController());
    const target = result.current.users.find((u) => u.id === 11);

    await act(async () => {
      await result.current.actions.onDeactivateUser(target);
    });

    expect(updateUserStatus).toHaveBeenCalledWith(11, "deactivated");
  });

  it("reactivates user via status patch", async () => {
    const { result } = renderHook(() => useUsersController());
    const target = result.current.users.find((u) => u.id === 12);

    await act(async () => {
      await result.current.actions.onReactivateUser(target);
    });

    expect(updateUserStatus).toHaveBeenCalledWith(12, "active");
  });

  it("uses statusTargetId fallback when id is not present", async () => {
    useUsers.mockReturnValueOnce({
      data: [{ user_id: 91, full_name: "Fallback User", email: "fallback@example.com", role: "personnel", status: "active" }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({}),
    });
    const { result } = renderHook(() => useUsersController());

    await act(async () => {
      await result.current.actions.onDeactivateUser(result.current.users[0]);
    });

    expect(updateUserStatus).toHaveBeenCalledWith(91, "deactivated");
  });

  it("blocks self-deactivation", async () => {
    useUsers.mockReturnValueOnce({
      data: [{ id: 77, full_name: "Root Admin", email: "root@example.com", role: "admin", status: "active" }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({}),
    });
    const { result } = renderHook(() => useUsersController());

    await act(async () => {
      await result.current.actions.onDeactivateUser(result.current.users[0]);
    });

    expect(updateUserStatus).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Cannot deactivate your own account",
      })
    );
  });

  it("refetches after successful status update", async () => {
    const refetch = vi.fn().mockResolvedValue({});
    useUsers.mockReturnValueOnce({
      data: [{ id: 11, full_name: "Personnel A", email: "a@example.com", role: "personnel", status: "active" }],
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    const { result } = renderHook(() => useUsersController());

    await act(async () => {
      await result.current.actions.onDeactivateUser(result.current.users[0]);
    });

    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });

  it("blocks status update when no status target id exists", async () => {
    useUsers.mockReturnValueOnce({
      data: [{ id: "", full_name: "No Id User", email: "missing@example.com", role: "personnel", status: "active" }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({}),
    });
    const { result } = renderHook(() => useUsersController());

    await act(async () => {
      await result.current.actions.onDeactivateUser(result.current.users[0]);
    });

    expect(updateUserStatus).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Cannot update user status",
        description: "Missing user identifier for status update.",
      })
    );
  });

  it("shows backend 409 message for status update failures", async () => {
    updateUserStatus.mockRejectedValueOnce({
      status: 409,
      message: "Only personnel accounts can be deactivated/reactivated",
    });
    const { result } = renderHook(() => useUsersController());

    await act(async () => {
      await result.current.actions.onDeactivateUser(result.current.users[0]);
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Failed to deactivate user",
        description: "Only personnel accounts can be deactivated/reactivated",
      })
    );
  });

  it("shows generic fallback for non-contract status update failures", async () => {
    updateUserStatus.mockRejectedValueOnce({
      status: 500,
      message: "Internal server error",
    });
    const { result } = renderHook(() => useUsersController());

    await act(async () => {
      await result.current.actions.onDeactivateUser(result.current.users[0]);
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Failed to deactivate user",
        description: "Please try again.",
      })
    );
  });

  it("creates a user, refetches, resets form, and closes dialog", async () => {
    const refetch = vi.fn().mockResolvedValue({});
    useUsers.mockReturnValue({
      data: [{ id: 11, full_name: "Personnel A", email: "a@example.com", role: "personnel", status: "active" }],
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });

    const { result } = renderHook(() => useUsersController());

    act(() => {
      result.current.actions.onOpenCreateUser();
      result.current.actions.onCreateFormChange("full_name", "  New User  ");
      result.current.actions.onCreateFormChange("email", "  NEW@Example.com ");
      result.current.actions.onCreateFormChange("password", "Passcode12!");
      result.current.actions.onCreateFormChange("role", "admin");
    });

    await act(async () => {
      await result.current.actions.onCreateUser();
    });

    expect(createUser).toHaveBeenCalledWith({
      full_name: "New User",
      email: "new@example.com",
      password: "Passcode12!",
      role: "admin",
    });
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    expect(result.current.isCreateDialogOpen).toBe(false);
    expect(result.current.createForm).toEqual({
      full_name: "",
      email: "",
      password: "",
      role: "personnel",
    });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "User created",
      })
    );
  });

  it("blocks create submit when form is invalid", async () => {
    const { result } = renderHook(() => useUsersController());

    act(() => {
      result.current.actions.onOpenCreateUser();
      result.current.actions.onCreateFormChange("full_name", "A");
      result.current.actions.onCreateFormChange("email", "bad-email");
      result.current.actions.onCreateFormChange("password", "short");
    });

    await act(async () => {
      await result.current.actions.onCreateUser();
    });

    expect(createUser).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Invalid user details",
      })
    );
    expect(result.current.isCreateDialogOpen).toBe(true);
  });

  it("keeps the create dialog open when create user fails", async () => {
    createUser.mockRejectedValueOnce(new Error("Email already exists"));
    const { result } = renderHook(() => useUsersController());

    act(() => {
      result.current.actions.onOpenCreateUser();
      result.current.actions.onCreateFormChange("full_name", "New User");
      result.current.actions.onCreateFormChange("email", "new@example.com");
      result.current.actions.onCreateFormChange("password", "Passcode12!");
      result.current.actions.onCreateFormChange("role", "personnel");
    });

    await act(async () => {
      await result.current.actions.onCreateUser();
    });

    expect(result.current.isCreateDialogOpen).toBe(true);
    expect(result.current.createForm).toEqual({
      full_name: "New User",
      email: "new@example.com",
      password: "Passcode12!",
      role: "personnel",
    });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Failed to create user",
        description: "Email already exists",
      })
    );
  });

  it("shows duplicate email message for 409 create failures", async () => {
    createUser.mockRejectedValueOnce({
      status: 409,
      message: "Admin email already exists",
    });
    const { result } = renderHook(() => useUsersController());

    act(() => {
      result.current.actions.onOpenCreateUser();
      result.current.actions.onCreateFormChange("full_name", "New User");
      result.current.actions.onCreateFormChange("email", "new@example.com");
      result.current.actions.onCreateFormChange("password", "Passcode12!");
      result.current.actions.onCreateFormChange("role", "admin");
    });

    await act(async () => {
      await result.current.actions.onCreateUser();
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Failed to create user",
        description: "Admin email already exists",
      })
    );
    expect(result.current.isCreateDialogOpen).toBe(true);
  });

  it("shows validation message for 422 create failures", async () => {
    createUser.mockRejectedValueOnce({
      status: 422,
      message: "Role is required",
    });
    const { result } = renderHook(() => useUsersController());

    act(() => {
      result.current.actions.onOpenCreateUser();
      result.current.actions.onCreateFormChange("full_name", "New User");
      result.current.actions.onCreateFormChange("email", "new@example.com");
      result.current.actions.onCreateFormChange("password", "Passcode12!");
      result.current.actions.onCreateFormChange("role", "admin");
    });

    await act(async () => {
      await result.current.actions.onCreateUser();
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Failed to create user",
        description: "Role is required",
      })
    );
    expect(result.current.isCreateDialogOpen).toBe(true);
  });

  it("hides create access when manage_admins permission is missing", () => {
    useAdminAuth.mockReturnValueOnce({
      me: { id: 77, full_name: "Root Admin", email: "root@example.com", role: "staff" },
      loading: false,
      hasPermission: vi.fn((permission) => permission === "manage_users"),
    });

    const { result } = renderHook(() => useUsersController());

    expect(result.current.canManageUsers).toBe(true);
    expect(result.current.canCreateUsers).toBe(false);

    act(() => {
      result.current.actions.onOpenCreateUser();
    });

    expect(result.current.isCreateDialogOpen).toBe(false);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "You do not have permission",
      })
    );
  });
});
