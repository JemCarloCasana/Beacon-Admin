import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/services/api";

function normalizeAdminRequestsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.requests)) return payload.requests;
  return [];
}

export function useAdminRequests(options = {}) {
  return useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const response = await apiGet("/admin/admin-requests");
      return normalizeAdminRequestsPayload(response);
    },
    staleTime: 1000 * 15,
    retry: 1,
    ...options,
  });
}

export function useAcceptAdminRequest(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, note, role = "admin", permissions } = {}) => {
      const payload = {
        note: note || null,
      };

      if (role) payload.role = role;
      // Send the grant the operator chose, including an empty one. Leaving
      // it off lets the server substitute a default grant of its own, and
      // the account would end up with powers nobody picked.
      if (Array.isArray(permissions)) {
        payload.permissions = permissions;
      }

      try {
        return await apiPatch(`/admin/admin-requests/${requestId}/accept`, payload);
      } catch (error) {
        const status = error?.status;
        // Only fall back to the note-only payload for a backend that
        // cannot take the extended one. When an explicit grant was sent,
        // a rejection must surface: retrying without it would grant
        // something the operator did not choose.
        const sentExplicitGrant = Array.isArray(payload.permissions);

        if (!sentExplicitGrant && Boolean(payload?.role) && (status === 400 || status === 422)) {
          return apiPatch(`/admin/admin-requests/${requestId}/accept`, {
            note: note || null,
          });
        }

        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    ...options,
  });
}

export function useRejectAdminRequest(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, note }) => {
      return apiPatch(`/admin/admin-requests/${requestId}/reject`, {
        note: note || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    ...options,
  });
}
