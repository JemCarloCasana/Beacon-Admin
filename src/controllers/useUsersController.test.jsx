import { act, renderHook, waitFor } from "@testing-library/react";
import { useUsersController } from "@/controllers/useUsersController";
import { useUsers } from "@/api";
import { updateUserStatus } from "@/api/useUsers";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { useToast } from "@/hooks/use-toast";

const toast = vi.fn();

vi.mock("@/api", () => ({
  useUsers: vi.fn(),
}));

vi.mock("@/api/useUsers", () => ({
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
});
