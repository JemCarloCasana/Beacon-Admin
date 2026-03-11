import { act, renderHook } from "@testing-library/react";
import { useBroadcastsController } from "@/controllers/useBroadcastsController";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useBroadcasts, useCreateBroadcast, useSendBroadcast } from "@/api/useBroadcasts";

const toast = vi.fn();
const createMutateAsync = vi.fn();
const sendMutateAsync = vi.fn();
const refetch = vi.fn();

vi.mock("@/auth/AdminAuthProvider", () => ({
  useAdminAuth: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(),
}));

vi.mock("@/api/useBroadcasts", () => ({
  useBroadcasts: vi.fn(),
  useCreateBroadcast: vi.fn(),
  useSendBroadcast: vi.fn(),
}));

describe("useBroadcastsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAdminAuth.mockReturnValue({
      me: { id: 1, full_name: "Admin" },
      loading: false,
      hasPermission: vi.fn(() => true),
    });
    useToast.mockReturnValue({ toast });
    useBroadcasts.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    useCreateBroadcast.mockReturnValue({
      mutateAsync: createMutateAsync,
      isPending: false,
    });
    useSendBroadcast.mockReturnValue({
      mutateAsync: sendMutateAsync,
      isPending: false,
    });

    createMutateAsync.mockResolvedValue({ id: 99 });
    sendMutateAsync.mockResolvedValue({ ok: true });
    refetch.mockResolvedValue({});
  });

  it("sends audience_roles citizen when role audience is citizen", async () => {
    const { result } = renderHook(() => useBroadcastsController());

    act(() => {
      result.current.actions.onFormChange("title", "Campus Advisory");
      result.current.actions.onFormChange("body", "Body");
      result.current.actions.onFormChange("audience_type", "role");
      result.current.actions.onFormChange("audience_role", "citizen");
    });

    await act(async () => {
      await result.current.actions.onCreateDraft();
    });

    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        audience_type: "role",
        audience_roles: ["citizen"],
      })
    );
    expect(createMutateAsync).not.toHaveBeenCalledWith(
      expect.objectContaining({
        audience_role_ids: expect.anything(),
      })
    );
  });

  it("sends audience_roles student when role audience is student", async () => {
    const { result } = renderHook(() => useBroadcastsController());

    act(() => {
      result.current.actions.onFormChange("title", "Campus Advisory");
      result.current.actions.onFormChange("body", "Body");
      result.current.actions.onFormChange("audience_type", "role");
      result.current.actions.onFormChange("audience_role", "student");
    });

    await act(async () => {
      await result.current.actions.onCreateDraft();
    });

    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        audience_type: "role",
        audience_roles: ["student"],
      })
    );
  });

  it("blocks create when role audience has no selected role", async () => {
    const { result } = renderHook(() => useBroadcastsController());

    act(() => {
      result.current.actions.onFormChange("title", "Campus Advisory");
      result.current.actions.onFormChange("body", "Body");
      result.current.actions.onFormChange("audience_type", "role");
    });

    await act(async () => {
      await result.current.actions.onCreateDraft();
    });

    expect(createMutateAsync).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Role is required",
      })
    );
  });

  it("submits all-users audience without role fields and clears stale audience_role", async () => {
    const { result } = renderHook(() => useBroadcastsController());

    act(() => {
      result.current.actions.onFormChange("title", "Campus Advisory");
      result.current.actions.onFormChange("body", "Body");
      result.current.actions.onFormChange("audience_type", "role");
      result.current.actions.onFormChange("audience_role", "student");
      result.current.actions.onFormChange("audience_type", "all");
    });

    expect(result.current.form.audience_role).toBe("");

    await act(async () => {
      await result.current.actions.onCreateDraft();
    });

    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.not.objectContaining({
        audience_roles: expect.anything(),
      })
    );
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.not.objectContaining({
        audience_role_ids: expect.anything(),
      })
    );
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        audience_type: "all",
      })
    );
  });
});
