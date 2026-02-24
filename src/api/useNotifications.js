import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/services/api";

function normalizeNotificationsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  return [];
}

export function useNotifications(options = {}) {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await apiGet("/admin/notifications");
      return normalizeNotificationsPayload(response);
    },
    staleTime: 1000 * 30,
    retry: 1,
    ...options,
  });
}

export function useMarkNotificationRead(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId) => {
      return apiPatch(`/admin/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    ...options,
  });
}

