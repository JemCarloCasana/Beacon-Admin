import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/services/api";

export const ADMIN_PERMISSION_CATALOG = [
  "manage_users",
  "manage_admins",
  "manage_broadcasts",
  "view_broadcasts",
  "view_incidents",
  "manage_incidents",
  "manage_sos",
  "manage_reports",
];

// The least privilege that still lets a promoted admin work the emergency
// path. The backend's own OPS_SUITE_PERMISSIONS is what a directly-created
// admin gets, but it includes manage_reports and manage_broadcasts, which are
// supervisory rather than operational. This set opens the SOS screen, the
// incidents list and the map - and nothing more. The accept dialog starts
// here and the operator can narrow or widen it.
export const DEFAULT_PROMOTED_ADMIN_PERMISSIONS = [
  "manage_sos",
  "view_incidents",
  "manage_incidents",
  "view_broadcasts",
];

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
      if (Array.isArray(permissions) && permissions.length > 0) {
        payload.permissions = permissions;
      }

      try {
        return await apiPatch(`/admin/admin-requests/${requestId}/accept`, payload);
      } catch (error) {
        const status = error?.status;
        const hasExtendedPayload =
          Boolean(payload?.role) || Array.isArray(payload?.permissions);

        // Backward compatibility: retry with note-only payload for older backends.
        if (hasExtendedPayload && (status === 400 || status === 422)) {
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
