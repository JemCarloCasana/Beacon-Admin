import { useMemo, useState } from "react";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useBroadcasts, useCreateBroadcast, useSendBroadcast } from "@/api/useBroadcasts";

const DEFAULT_FORM = {
  title: "",
  body: "",
  severity: "info",
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

  const canManageBroadcasts = hasPermission("manage_broadcasts");

  const broadcastsQuery = useBroadcasts({
    enabled: !loading && !!me && canManageBroadcasts,
  });
  const createBroadcastMutation = useCreateBroadcast();
  const sendBroadcastMutation = useSendBroadcast();

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
    const title = String(form.title || "").trim();
    const body = String(form.body || "").trim();
    const severity = String(form.severity || "info");
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
    }
  };

  const onOpenSendDialog = (broadcast) => {
    if (!broadcast?.id) return;
    setPendingSendBroadcast(broadcast);
  };

  const onCloseSendDialog = () => {
    if (sendBroadcastMutation.isPending) return;
    setPendingSendBroadcast(null);
  };

  const onConfirmSend = async () => {
    if (!pendingSendBroadcast?.id) return;

    try {
      const result = await sendBroadcastMutation.mutateAsync({
        broadcastId: pendingSendBroadcast.id,
      });
      setLastSendResult(result);
      toast({
        title: "Broadcast sent",
        description: `Broadcast #${pendingSendBroadcast.id} has been sent.`,
      });
      setPendingSendBroadcast(null);
    } catch (error) {
      const status = Number(error?.status || 0);
      toast({
        title: status === 409 ? "Broadcast already sent" : "Failed to send broadcast",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
      if (status === 409) {
        broadcastsQuery.refetch();
        setPendingSendBroadcast(null);
      }
    }
  };

  return {
    canManageBroadcasts,
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
