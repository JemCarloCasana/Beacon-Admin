import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/services/api";

function normalizeBroadcastsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.broadcasts)) return payload.broadcasts;
  return [];
}

async function fetchBroadcasts() {
  const response = await apiGet("/admin/broadcasts");
  return normalizeBroadcastsPayload(response);
}

export function useBroadcasts(options = {}) {
  return useQuery({
    queryKey: ["broadcasts"],
    queryFn: fetchBroadcasts,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
    ...options,
  });
}

export function useCreateBroadcast(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      return apiPost("/admin/broadcasts", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
    },
    ...options,
  });
}

export function useSendBroadcast(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ broadcastId }) => {
      return apiPost(`/admin/broadcasts/${broadcastId}/send`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
    },
    ...options,
  });
}

