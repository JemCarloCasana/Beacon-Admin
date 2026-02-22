import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useIncidents } from "@/hooks/useIncidents";
import { useSOS } from "@/hooks/useSOS";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { toAdminModel } from "@/models/admin.model";
import { toDashboardIncidentListModel } from "@/models/incident.model";

/**
 * ViewController for dashboard.
 */
export function useDashboardController() {
  const navigate = useNavigate();
  const { me, loading, hasPermission } = useAdminAuth();
  const { incidents = [] } = useIncidents();
  const { activeAlerts = [], acknowledgeAlert } = useSOS();

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [sosClosed, setSosClosed] = useState(false);

  const admin = useMemo(() => toAdminModel(me), [me]);
  const transformedIncidents = useMemo(
    () => toDashboardIncidentListModel(incidents),
    [incidents]
  );

  const canManageIncidents = hasPermission("manage_incidents");
  const canViewIncidents = hasPermission("view_incidents") || canManageIncidents;
  const canManageUsers = hasPermission("manage_users");
  const canManageAdmins = hasPermission("manage_admins");

  useEffect(() => {
    if (!selectedIncident && transformedIncidents.length > 0) {
      setSelectedIncident(transformedIncidents[0]);
    }
  }, [selectedIncident, transformedIncidents]);

  const activeSOS = useMemo(() => {
    const source = activeAlerts.length > 0 ? activeAlerts[0] : null;
    if (!source) return null;

    return {
      ...source,
      timestamp: source.timestamp
        ? formatDistanceToNow(new Date(source.timestamp), { addSuffix: true }).replace("about ", "")
        : "2m ago",
      description: source.message || "SOS Alert",
    };
  }, [activeAlerts]);

  return {
    loading,
    me: admin,
    canManageUsers,
    canManageAdmins,
    canManageIncidents,
    canViewIncidents,
    incidents: canViewIncidents ? transformedIncidents : [],
    selectedIncident,
    activeSOS,
    sosClosed,
    actions: {
      onSelectIncident: setSelectedIncident,
      onCloseSos: () => setSosClosed(true),
      onAcknowledgeSos: (id) => acknowledgeAlert(id, String(admin?.id ?? "")),
      onDispatchSos: (_id) => {
        if (!canManageIncidents) return;
      },
      onGoToPersonnel: () => navigate("/personnel"),
      onGoToAdmins: () => navigate("/admins"),
    },
  };
}

export default useDashboardController;

