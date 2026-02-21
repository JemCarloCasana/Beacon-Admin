import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '@/services/api';

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
      return response || [];
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
      const response = await apiGet('/admin/sos?status=active');
      return response || [];
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time feel
    ...options,
  });
};

/**
 * Hook to fetch a single SOS alert by ID
 * 
 * Usage:
 * const { data: sosAlert } = useSOSDetail(123);
 */
export const useSOSDetail = (id, options = {}) => {
  return useQuery({
    queryKey: ['sos-alerts', id],
    queryFn: async () => {
      const response = await apiGet(`/admin/sos/${id}`);
      return response;
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    enabled: !!id,
    ...options,
  });
};

/**
 * Hook to mark SOS alert as safe/resolved
 * 
 * Usage:
 * const markSafe = useMarkSOSSafe();
 * markSafe.mutate({ id: 123 });
 */
export const useMarkSOSSafe = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }) => {
      return apiPatch(`/admin/sos/${id}/safe`, {});
    },
    onSuccess: (data, variables) => {
      // Invalidate SOS caches
      queryClient.invalidateQueries({ queryKey: ['sos-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['sos-alerts', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['sos-alerts', variables.id] });
    },
    ...options,
  });
};

/**
 * Hook to dispatch to an SOS alert
 * 
 * Usage:
 * const dispatch = useDispatchSOS();
 * dispatch.mutate({ id: 123, responder_id: 456 });
 */
export const useDispatchSOS = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, responder_id }) => {
      return apiPatch(`/admin/sos/${id}/dispatch`, { responder_id });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sos-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['sos-alerts', variables.id] });
    },
    ...options,
  });
};

/**
 * Hook to acknowledge an SOS alert
 * 
 * Usage:
 * const ack = useAcknowledgeSOS();
 * ack.mutate({ id: 123 });
 */
export const useAcknowledgeSOS = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }) => {
      return apiPatch(`/admin/sos/${id}/acknowledge`, {});
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sos-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['sos-alerts', variables.id] });
    },
    ...options,
  });
};

export default useSOSAlerts;
