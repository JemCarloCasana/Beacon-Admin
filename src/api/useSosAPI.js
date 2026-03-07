import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/services/api';

export const SOS_ASSIGNED_UNITS = [
  "Emergency Medical Unit",
  "Fire Station Unit",
  "Police Personnel",
  "Traffic Enforcement Unit",
];

function normalizeListPayload(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

/**
 * Hook to fetch all SOS alerts
 * 
 * Usage:
 * const { data: sosAlerts, isLoading, error } = useSOSAlerts();
 */
export const useSOSAlerts = (options = {}) => {
  return useQuery({
    queryKey: ['sos-alerts'],
    queryFn: async () => {
      const response = await apiGet('/admin/sos');
      return normalizeListPayload(response, ['alerts', 'sos', 'threads', 'items', 'rows', 'results']);
    },
    staleTime: 1000 * 30, // 30 seconds (SOS is real-time)
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};

/**
 * Hook to fetch active SOS alerts only
 * 
 * Usage:
 * const { data: activeAlerts } = useActiveSOSAlerts();
 */
export const useActiveSOSAlerts = (options = {}) => {
  return useQuery({
    queryKey: ['sos-alerts', 'active'],
    queryFn: async () => {
      const response = await apiGet('/admin/sos/live?status=active');
      return normalizeListPayload(response, ['alerts', 'sos', 'threads', 'items', 'rows', 'results']);
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time feel
    ...options,
  });
};

/**
 * Hook to fetch map-ready active SOS points.
 */
export const useActiveSOSMap = (options = {}) => {
  return useQuery({
    queryKey: ['sos-alerts', 'map-live'],
    queryFn: async () => {
      const response = await apiGet('/admin/sos/live-map');
      return normalizeListPayload(response, ['markers', 'points', 'sos', 'threads', 'items', 'rows', 'results']);
    },
    staleTime: 1000 * 5,
    gcTime: 1000 * 60 * 5,
    refetchInterval: 5000,
    ...options,
  });
};

/**
 * Hook to fetch SOS live queue.
 *
 * Usage:
 * const { data } = useSOSLiveQueue({ status: 'open', limit: 100 });
 */
export const useSOSLiveQueue = ({ status = 'open', limit = 100, cursor = null } = {}, options = {}) => {
  return useQuery({
    queryKey: ['sos-live', status, limit, cursor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (limit) params.set('limit', String(limit));
      if (cursor) params.set('cursor', String(cursor));
      const suffix = params.toString();
      const response = await apiGet(`/admin/sos/live${suffix ? `?${suffix}` : ''}`);
      return normalizeListPayload(response, ['alerts', 'sos', 'threads', 'items', 'rows', 'results']);
    },
    staleTime: 1000 * 5,
    gcTime: 1000 * 60 * 5,
    refetchInterval: 5000,
    ...options,
  });
};

/**
 * Hook to fetch a single SOS thread by sosId.
 * 
 * Usage:
 * const { data: detail } = useSOSDetail(123);
 */
export const useSOSDetail = (sosId, options = {}) => {
  return useQuery({
    queryKey: ['sos-alerts', 'detail', sosId],
    queryFn: async () => {
      const response = await apiGet(`/admin/sos/${sosId}`);
      return response;
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    enabled: !!sosId,
    ...options,
  });
};

/**
 * Hook to resolve an SOS thread.
 * 
 * Usage:
 * const resolve = useResolveSOS();
 * resolve.mutate({ sosId: 123, note: "Case closed" });
 */
export const useResolveSOS = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sosId, note }) => {
      return apiPost(`/admin/sos/${sosId}/resolve`, note ? { note } : {});
    },
    onSuccess: (data, variables) => {
      // Invalidate SOS caches
      queryClient.invalidateQueries({ queryKey: ['sos-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['sos-alerts', 'map-live'] });
      queryClient.invalidateQueries({ queryKey: ['sos-live'] });
      queryClient.invalidateQueries({ queryKey: ['sos-alerts', 'detail', variables.sosId] });
    },
    ...options,
  });
};

/**
 * Hook to acknowledge an SOS thread.
 * 
 * Usage:
 * const ack = useAcknowledgeSOS();
 * ack.mutate({ sosId: 123, note: "Responder assigned" });
 */
export const useAcknowledgeSOS = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sosId, assigned_unit, note }) => {
      const normalizedAssignedUnit = String(assigned_unit || "").trim();
      if (!SOS_ASSIGNED_UNITS.includes(normalizedAssignedUnit)) {
        const error = new Error(
          "assigned_unit is required and must be one of: Emergency Medical Unit, Fire Station Unit, Police Personnel, Traffic Enforcement Unit."
        );
        error.status = 400;
        throw error;
      }

      const payload = { assigned_unit: normalizedAssignedUnit };
      if (note) payload.note = note;
      return apiPost(`/admin/sos/${sosId}/acknowledge`, payload);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sos-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['sos-alerts', 'map-live'] });
      queryClient.invalidateQueries({ queryKey: ['sos-live'] });
      queryClient.invalidateQueries({ queryKey: ['sos-alerts', 'detail', variables.sosId] });
    },
    ...options,
  });
};

export default useSOSAlerts;
