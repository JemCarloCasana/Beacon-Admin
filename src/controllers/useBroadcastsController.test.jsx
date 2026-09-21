import { act, renderHook } from "@testing-library/react";
import { useBroadcastsController } from "@/controllers/useBroadcastsController";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useBroadcasts, useCreateBroadcast, useSendBroadcast, useUpdateBroadcast, useDeleteBroadcast } from "@/api/useBroadcasts";

const toast = vi.fn();
const createMutateAsync = vi.fn();
const sendMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
const deleteMutateAsync = vi.fn();
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
  useUpdateBroadcast: vi.fn(),
  useDeleteBroadcast: vi.fn(),
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
    updateMutateAsync.mockResolvedValue({ id: 7 });
    deleteMutateAsync.mockResolvedValue({ ok: true });
    refetch.mockResolvedValue({});
    useUpdateBroadcast.mockReturnValue({ mutateAsync: updateMutateAsync, isPending: false });
    useDeleteBroadcast.mockReturnValue({ mutateAsync: deleteMutateAsync, isPending: false });
  });

  it("sends audience_roles citizen when role audience is citizen", async () => {
    const { result } = renderHook(() => useBroadcastsController());

    expect(result.current.form.severity).toBe("announcement");

    act(() => {
      result.current.actions.onFormChange("title", "Campus Advisory");
      result.current.actions.onFormChange("body", "Body");
      result.current.actions.onFormChange("severity", "danger");
      result.current.actions.onFormChange("audience_type", "role");
      result.current.actions.onFormChange("audience_role", "citizen");
    });

    await act(async () => {
      await result.current.actions.onCreateDraft();
    });

    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "danger",
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
      result.current.actions.onFormChange("severity", "warning");
      result.current.actions.onFormChange("audience_type", "role");
      result.current.actions.onFormChange("audience_role", "student");
    });

    await act(async () => {
      await result.current.actions.onCreateDraft();
    });

    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "warning",
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

  it("updates draft with title/body/severity only and preserves audience", async () => {
    const draft = {
      id: 7,
      title: "Old",
      body: "Old body",
      severity: "announcement",
      audience_type: "role",
      audience_roles: ["student"],
      sent_at: null,
    };
    useBroadcasts.mockReturnValue({
      data: [draft],
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    useAdminAuth.mockReturnValue({
      me: { id: 1, role: "admin" },
      loading: false,
      hasPermission: vi.fn(() => true),
    });
    const { result } = renderHook(() => useBroadcastsController());

    act(() => {
      result.current.actions.onOpenEditDialog(draft);
    });
    expect(result.current.editingBroadcast).toMatchObject({ id: 7 });

    act(() => {
      result.current.actions.onEditFormChange("title", "New title");
    });

    await act(async () => {
      await result.current.actions.onSaveDraft();
    });

    expect(updateMutateAsync).toHaveBeenCalledWith({
      broadcastId: 7,
      payload: expect.objectContaining({ title: "New title", severity: "announcement" }),
    });
    const payload = updateMutateAsync.mock.calls[0][0].payload;
    expect(payload).not.toHaveProperty("audience_type");
    expect(payload).not.toHaveProperty("audience_roles");
    expect(result.current.editingBroadcast).toBeNull();
  });

  it("recovers from 404 on save by refetching and closing the dialog", async () => {
    const draft = { id: 8, title: "T", body: "B", severity: "warning", sent_at: null };
    useBroadcasts.mockReturnValue({
      data: [draft],
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    updateMutateAsync.mockRejectedValueOnce({ status: 404, message: "Gone" });
    const { result } = renderHook(() => useBroadcastsController());

    act(() => {
      result.current.actions.onOpenEditDialog(draft);
    });

    await act(async () => {
      await result.current.actions.onSaveDraft();
    });

    expect(refetch).toHaveBeenCalled();
    expect(result.current.editingBroadcast).toBeNull();
    expect(result.current.mutationError).toMatch(/Gone/);
  });

  it("blocks edit on sent records and delete for non-admin roles", () => {
    const sent = { id: 9, title: "S", body: "B", severity: "danger", sent_at: "2026-01-01T00:00:00Z" };
    const draft = { id: 10, title: "D", body: "B", severity: "danger", sent_at: null };
    useBroadcasts.mockReturnValue({
      data: [sent, draft],
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    useAdminAuth.mockReturnValue({
      me: { id: 2, role: "personnel" },
      loading: false,
      hasPermission: vi.fn(() => true),
    });
    const { result } = renderHook(() => useBroadcastsController());

    expect(result.current.canDeleteBroadcasts).toBe(false);

    act(() => {
      result.current.actions.onOpenEditDialog(sent);
    });
    expect(result.current.editingBroadcast).toBeNull();

    act(() => {
      result.current.actions.onOpenDeleteDialog(draft);
    });
    expect(result.current.pendingDeleteBroadcast).toBeNull();
    expect(deleteMutateAsync).not.toHaveBeenCalled();
  });
});
