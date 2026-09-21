import { useMemo, useRef, useState } from "react";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useBroadcasts, useCreateBroadcast, useSendBroadcast, useUpdateBroadcast, useDeleteBroadcast } from "@/api/useBroadcasts";

const DEFAULT_FORM = {
  title: "",
  body: "",
  severity: "announcement",
  audience_type: "all",
  audience_role: "",
};

const ALLOWED_AUDIENCE_ROLES = new Set(["citizen", "student"]);

function toSortedBroadcasts(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const aTime = new Date(a?.created_at || 0).getTime();
    const bTime = new Date(b?.created_at || 0).getTime();
    return bTime - aTime;
  });
}

export function useBroadcastsController() {
  const { me, loading, hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [pendingSendBroadcast, setPendingSendBroadcast] = useState(null);
  const [lastSendResult, setLastSendResult] = useState(null);
  const [editingBroadcast, setEditingBroadcast] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", body: "", severity: "announcement" });
  const [pendingDeleteBroadcast, setPendingDeleteBroadcast] = useState(null);
  const [mutationError, setMutationError] = useState("");
  const mutationLock = useRef(false);

  const canManageBroadcasts = hasPermission("manage_broadcasts");

  const broadcastsQuery = useBroadcasts({
    enabled: !loading && !!me && canManageBroadcasts,
  });
  const createBroadcastMutation = useCreateBroadcast();
  const sendBroadcastMutation = useSendBroadcast();
  const updateBroadcastMutation = useUpdateBroadcast();
  const deleteBroadcastMutation = useDeleteBroadcast();
  const canDeleteBroadcasts = canManageBroadcasts && String(me?.role).toLowerCase() === "admin";
  const busy = createBroadcastMutation.isPending || sendBroadcastMutation.isPending || updateBroadcastMutation.isPending || deleteBroadcastMutation.isPending;

  const broadcasts = useMemo(
    () => toSortedBroadcasts(broadcastsQuery.data),
    [broadcastsQuery.data]
  );

  const drafts = useMemo(
    () => broadcasts.filter((item) => !item?.sent_at),
    [broadcasts]
  );
  const sent = useMemo(
    () => broadcasts.filter((item) => !!item?.sent_at),
    [broadcasts]
  );

  const onFormChange = (field, value) => {
    setForm((prev) => {
      if (field === "audience_type" && value !== "role") {
        return { ...prev, audience_type: value, audience_role: "" };
      }
      return { ...prev, [field]: value };
    });
  };

  const onCreateDraft = async () => {
    if (!canManageBroadcasts || busy || mutationLock.current) return;
    const title = String(form.title || "").trim();
    const body = String(form.body || "").trim();
    const severity = String(form.severity || "announcement");
    const audienceType = String(form.audience_type || "all");

    if (!title) {
      toast({
        title: "Title is required",
        description: "Enter a title before creating the broadcast.",
        variant: "destructive",
      });
      return;
    }

    if (!body) {
      toast({
        title: "Body is required",
        description: "Enter a message body before creating the broadcast.",
        variant: "destructive",
      });
      return;
    }

    if (title.length > 200 || body.length > 5000 || !["announcement", "warning", "danger"].includes(severity)) {
      toast({ title: "Invalid broadcast", description: "Use a title up to 200 characters, a message up to 5,000 characters, and a valid severity.", variant: "destructive" });
      return;
    }
    const payload = {
      title,
      body,
      severity,
      audience_type: audienceType,
    };

    if (audienceType === "role") {
      const audienceRole = String(form.audience_role || "").trim().toLowerCase();
      if (!ALLOWED_AUDIENCE_ROLES.has(audienceRole)) {
        toast({
          title: "Role is required",
          description: "Select a valid role for role-based audience.",
          variant: "destructive",
        });
        return;
      }

      payload.audience_roles = [audienceRole];
    }

    mutationLock.current = true;
    try {
      await createBroadcastMutation.mutateAsync(payload);
      toast({
        title: "Draft created",
        description: "Broadcast draft was created successfully.",
      });
      setForm(DEFAULT_FORM);
    } catch (error) {
      toast({
        title: "Failed to create draft",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      mutationLock.current = false;
    }
  };

  const onOpenSendDialog = (broadcast) => {
    if (!broadcast?.id || broadcast.sent_at || !canManageBroadcasts || busy || mutationLock.current) return;
    setPendingSendBroadcast(broadcast);
  };

  const onCloseSendDialog = () => {
    if (sendBroadcastMutation.isPending) return;
    setPendingSendBroadcast(null);
  };

  const onConfirmSend = async () => {
    if (!pendingSendBroadcast?.id || !canManageBroadcasts || busy || mutationLock.current) return;
    mutationLock.current = true;

    try {
      const result = await sendBroadcastMutation.mutateAsync({
        broadcastId: pendingSendBroadcast.id,
      });
      setLastSendResult(result);
      toast({
        title: "Broadcast sent",
        description: result?.push?.error || result?.push?.unknownCount > 0
          ? "Broadcast saved as sent, but some push notifications could not be confirmed. Do not resend."
          : `Broadcast #${pendingSendBroadcast.id} has been sent.`,
      });
      setPendingSendBroadcast(null);
    } catch (error) {
      const status = Number(error?.status || 0);
      toast({
        title: status === 409 ? "Broadcast already sent" : "Failed to send broadcast",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
      if (status === 409 || status === 404) {
        broadcastsQuery.refetch();
        setPendingSendBroadcast(null);
      }
    } finally {
      mutationLock.current = false;
    }
  };

  const onOpenEditDialog = (broadcast) => {
    if (!canManageBroadcasts || broadcast?.sent_at || !broadcast?.id || busy || mutationLock.current) return;
    setEditingBroadcast(broadcast);
    setEditForm({ title: broadcast.title, body: broadcast.body, severity: broadcast.severity });
    setMutationError("");
  };
  const onCloseEditDialog = () => { if (!mutationLock.current) { setEditingBroadcast(null); setMutationError(""); } };
  const onEditFormChange = (field, value) => {
    if (["title", "body", "severity"].includes(field)) setEditForm((previous) => ({ ...previous, [field]: value }));
  };
  const onOpenDeleteDialog = (broadcast) => {
    if (!canDeleteBroadcasts || broadcast?.sent_at || !broadcast?.id || busy || mutationLock.current) return;
    setPendingDeleteBroadcast(broadcast);
    setMutationError("");
  };
  const onCloseDeleteDialog = () => { if (!mutationLock.current) { setPendingDeleteBroadcast(null); setMutationError(""); } };
  const handleDraftError = (error) => {
    const message = error?.message || "Please try again.";
    setMutationError(message);
    toast({ title: "Draft could not be changed", description: message, variant: "destructive" });
    if ([404, 409].includes(Number(error?.status))) {
      broadcastsQuery.refetch();
      setEditingBroadcast(null);
      setPendingDeleteBroadcast(null);
    }
  };
  const onSaveDraft = async () => {
    if (!canManageBroadcasts || !editingBroadcast || busy || mutationLock.current) return;
    const payload = { title: String(editForm.title).trim(), body: String(editForm.body).trim(), severity: editForm.severity };
    if (!payload.title || payload.title.length > 200 || !payload.body || payload.body.length > 5000 || !["announcement", "warning", "danger"].includes(payload.severity)) {
      setMutationError("Enter a title (1–200 characters), message (1–5,000 characters), and valid severity.");
      return;
    }
    mutationLock.current = true;
    setMutationError("");
    try {
      await updateBroadcastMutation.mutateAsync({ broadcastId: editingBroadcast.id, payload });
      setEditingBroadcast(null);
      toast({ title: "Draft updated" });
    } catch (error) { handleDraftError(error); }
    finally { mutationLock.current = false; }
  };
  const onConfirmDelete = async () => {
    if (!canDeleteBroadcasts || !pendingDeleteBroadcast || busy || mutationLock.current) return;
    mutationLock.current = true;
    setMutationError("");
    try {
      await deleteBroadcastMutation.mutateAsync({ broadcastId: pendingDeleteBroadcast.id });
      setPendingDeleteBroadcast(null);
      toast({ title: "Draft deleted" });
    } catch (error) { handleDraftError(error); }
    finally { mutationLock.current = false; }
  };

  return {
    canManageBroadcasts,
    canDeleteBroadcasts,
    editingBroadcast, editForm, pendingDeleteBroadcast, mutationError,
    updating: updateBroadcastMutation.isPending,
    deleting: deleteBroadcastMutation.isPending,
    busy,
    form,
    drafts,
    sent,
    pendingSendBroadcast,
    lastSendResult,
    loading: broadcastsQuery.isLoading,
    error: broadcastsQuery.isError ? broadcastsQuery.error : null,
    creating: createBroadcastMutation.isPending,
    sending: sendBroadcastMutation.isPending,
    actions: {
      onOpenEditDialog, onCloseEditDialog, onEditFormChange, onSaveDraft,
      onOpenDeleteDialog, onCloseDeleteDialog, onConfirmDelete,
      onFormChange,
      onCreateDraft,
      onOpenSendDialog,
      onCloseSendDialog,
      onConfirmSend,
      onRefresh: broadcastsQuery.refetch,
    },
  };
}

export default useBroadcastsController;
