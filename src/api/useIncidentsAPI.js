import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/services/api';

/**
 * Hook to fetch all incidents
 * 
 * Usage:
 * const { data: incidents, isLoading, error } = useIncidentsAPI();
 */
export const useIncidentsAPI = (options = {}) => {
  return useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      const response = await apiGet('/admin/incidents');
      return response || [];
    },
    staleTime: 1000 * 60 * 1, // 1 minute (incidents may update frequently)
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};

/**
 * Hook to fetch incidents by status (e.g., 'active', 'resolved')
 * 
 * Usage:
 * const { data: activeIncidents } = useIncidentsByStatus('active');
 */
export const useIncidentsByStatus = (status, options = {}) => {
  return useQuery({
    queryKey: ['incidents', status],
    queryFn: async () => {
      const response = await apiGet(`/admin/incidents?status=${status}`);
      return response || [];
    },
    staleTime: 1000 * 60 * 1,
    gcTime: 1000 * 60 * 5,
    enabled: !!status, // Only run query if status is provided
    ...options,
  });
};

/**
 * Hook to fetch a single incident by ID
 * 
 * Usage:
 * const { data: incident } = useIncidentDetail(123);
 */
export const useIncidentDetail = (id, options = {}) => {
  return useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => {
      const response = await apiGet(`/admin/incidents/${id}`);
      return response;
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    enabled: !!id, // Only run query if id is provided
    ...options,
  });
};

/**
 * Hook to update an incident (e.g., mark as resolved, add notes)
 * 
 * Usage:
 * const updateIncident = useUpdateIncident();
 * updateIncident.mutate({ id: 123, status: 'resolved' });
 */
export const useUpdateIncident = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      return apiPatch(`/admin/incidents/${id}`, data);
    },
    onSuccess: (data, variables) => {
      // Invalidate incident cache so it refetches
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incidents', variables.id] });
    },
    ...options,
  });
};

export default useIncidentsAPI;
