// Export all API hooks
export { useUsers } from './useUsers';
export {
  useIncidentsAPI,
  useIncidentsByStatus,
  useIncidentDetail,
  useUpdateIncident,
} from './useIncidentsAPI';
export {
  useSOSAlerts,
  useActiveSOSAlerts,
  useSOSDetail,
  useMarkSOSSafe,
  useDispatchSOS,
  useAcknowledgeSOS,
} from './useSosAPI';
export { useNotifications, useMarkNotificationRead } from './useNotifications';
export {
  useAdminRequests,
  useAcceptAdminRequest,
  useRejectAdminRequest,
} from './useAdminRequests';
