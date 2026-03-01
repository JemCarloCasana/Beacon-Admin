import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/services/api';

const ALLOWED_ASSIGNED_DEPARTMENTS = [
  'Emergency Medical Unit',
  'Fire Station Unit',
  'Police Personnel',
  'Traffic Enforcement Unit',
];

function normalizeIncidentsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.incidents)) return payload.incidents;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function buildIncidentsUrl({ page, limit, status } = {}) {
  const params = new URLSearchParams();
  if (Number.isInteger(page) && page > 0) params.set('page', String(page));
  if (Number.isInteger(limit) && limit > 0) params.set('limit', String(limit));
  if (status) params.set('status', String(status));

  const query = params.toString();
  return query ? `/admin/incidents?${query}` : '/admin/incidents';
}

/**
 * Hook to fetch all incidents
 * 
 * Usage:
 * const { data: incidents, isLoading, error } = useIncidentsAPI();
 */
export const useIncidentsAPI = (params = {}, options = {}) => {
  const { page = 1, limit = 20, status = '' } = params;

  return useQuery({
    queryKey: ['incidents', { page, limit, status }],
    queryFn: async () => {
      const response = await apiGet(buildIncidentsUrl({ page, limit, status }));
      return normalizeIncidentsPayload(response);
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
      const response = await apiGet(buildIncidentsUrl({ status }));
      return normalizeIncidentsPayload(response);
    },
    staleTime: 1000 * 60 * 1,
    gcTime: 1000 * 60 * 5,
    enabled: !!status, // Only run query if status is provided
    ...options,
  });
};

/**
 * Hook to fetch incidents for the map (only rows with valid coordinates).
 */
export const useMapIncidents = (options = {}) => {
  return useQuery({
    queryKey: ['incidents', 'map'],
    queryFn: async () => {
      const response = await apiGet('/admin/incidents');
      // Keep all records and let map marker normalization decide coordinate validity.
      return normalizeIncidentsPayload(response);
    },
    staleTime: 1000 * 10,
    gcTime: 1000 * 60 * 5,
    refetchInterval: 15000,
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
      const payload = {};

      if (Object.prototype.hasOwnProperty.call(data, 'status')) payload.status = data.status;
      if (Object.prototype.hasOwnProperty.call(data, 'priority')) payload.priority = data.priority;
      if (Object.prototype.hasOwnProperty.call(data, 'incidentType')) {
        payload.incident_type = data.incidentType;
      }
      if (Object.prototype.hasOwnProperty.call(data, 'category')) {
        payload.incident_type = data.category;
      }
      if (Object.prototype.hasOwnProperty.call(data, 'incident_type')) {
        payload.incident_type = data.incident_type;
      }

      if (
        Object.prototype.hasOwnProperty.call(data, 'assignedDepartment') ||
        Object.prototype.hasOwnProperty.call(data, 'assigned_department')
      ) {
        const assignedDepartment =
          data.assignedDepartment ?? data.assigned_department ?? null;

        if (
          assignedDepartment !== null &&
          !ALLOWED_ASSIGNED_DEPARTMENTS.includes(assignedDepartment)
        ) {
          const error = new Error(
            'Invalid assigned_department. Must be one of: Emergency Medical Unit, Fire Station Unit, Police Personnel, Traffic Enforcement Unit, or null.'
          );
          error.status = 400;
          throw error;
        }

        payload.assigned_department = assignedDepartment;
      }
      if (Object.prototype.hasOwnProperty.call(data, 'resolutionNotes')) {
        payload.resolutionNotes = data.resolutionNotes;
      }
      if (Object.prototype.hasOwnProperty.call(data, 'resolution_notes')) {
        payload.resolutionNotes = data.resolution_notes;
      }

      return apiPatch(`/admin/incidents/${id}`, payload);
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
