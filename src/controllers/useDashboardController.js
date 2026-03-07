import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { useIncidentsAPI } from "@/api/useIncidentsAPI";
import { useSOSLiveQueue } from "@/api/useSosAPI";
import { useReportsOverview } from "@/api/useReportsAPI";
import { toAdminModel } from "@/models/admin.model";
import { toDashboardIncidentListModel, toIncidentListViewModel } from "@/models/incident.model";
import { toSosFeedAlert } from "@/models/sos-live.model";
import { toReportsOverviewModel } from "@/models/reports.model";

const ACTIVE_INCIDENT_STATUSES = new Set(["pending", "dispatched", "in_progress"]);
const REPORT_TIMEZONE = "Asia/Manila";
const REPORT_RANGE = "24h";

/**
 * ViewController for dashboard.
 */
export function useDashboardController() {
  const navigate = useNavigate();
  const { me, loading, hasPermission } = useAdminAuth();
  const incidentsQuery = useIncidentsAPI(
    { page: 1, limit: 50 },
    { refetchInterval: 5000 }
  );
  const sosQuery = useSOSLiveQueue(
    { status: "open", limit: 50 },
    { refetchInterval: 5000 }
  );
  const reportsQuery = useReportsOverview(
    { range: REPORT_RANGE, timezone: REPORT_TIMEZONE },
    { refetchInterval: 30000 }
  );

  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [dismissedSosId, setDismissedSosId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortByPriority, setSortByPriority] = useState(true);

  const admin = useMemo(() => toAdminModel(me), [me]);
  const incidents = useMemo(
    () => toIncidentListViewModel(incidentsQuery.data),
    [incidentsQuery.data]
  );
  const transformedIncidents = useMemo(() => {
    const filtered = incidents.filter((item) => {
      if (!ACTIVE_INCIDENT_STATUSES.has(item.status)) return false;
      if (statusFilter === "all") return true;
      return item.status === statusFilter;
    });
    const dashboardRows = toDashboardIncidentListModel(filtered);
    if (!sortByPriority) return dashboardRows;

    const rank = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...dashboardRows].sort((a, b) => {
      const aRank = Number.isInteger(rank[a.priority]) ? rank[a.priority] : 99;
      const bRank = Number.isInteger(rank[b.priority]) ? rank[b.priority] : 99;
      if (aRank !== bRank) return aRank - bRank;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [incidents, sortByPriority, statusFilter]);
  const liveSosAlerts = useMemo(() => {
    const rows = Array.isArray(sosQuery.data) ? sosQuery.data : [];
    return rows.map(toSosFeedAlert);
  }, [sosQuery.data]);
  const reportsOverview = useMemo(
    () => toReportsOverviewModel(reportsQuery.data),
    [reportsQuery.data]
  );

  const canManageUsers = hasPermission("manage_users");
  const canManageAdmins = hasPermission("manage_admins");

  useEffect(() => {
    if (!transformedIncidents.length) {
      setSelectedIncidentId(null);
      return;
    }

    if (!selectedIncidentId) {
      setSelectedIncidentId(transformedIncidents[0].id);
      return;
    }

    const stillExists = transformedIncidents.some((item) => item.id === selectedIncidentId);
    if (!stillExists) {
      setSelectedIncidentId(transformedIncidents[0].id);
    }
  }, [selectedIncidentId, transformedIncidents]);

  const selectedIncident = useMemo(
    () => transformedIncidents.find((item) => item.id === selectedIncidentId) || null,
    [selectedIncidentId, transformedIncidents]
  );

  const activeSOS = useMemo(() => {
    const prioritized = [...liveSosAlerts]
      .filter((item) => item.requires_attention === true)
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    const source = prioritized[0] || null;
    if (!source) return null;
    if (dismissedSosId && dismissedSosId === source.id) return null;

    return {
      ...source,
      name: source.userName,
      description: source.message || null,
    };
  }, [dismissedSosId, liveSosAlerts]);

  const kpis = useMemo(() => {
    const reportsKpis = reportsOverview.kpis || {};
    return {
      activeIncidents: reportsKpis.activeIncidents ?? transformedIncidents.length,
      activeSOS:
        reportsKpis.activeSOS ??
        liveSosAlerts.filter((item) => item.requires_attention === true).length,
      avgResponseSeconds: reportsKpis.avgResponseSeconds ?? 0,
      resolvedIncidents: reportsKpis.resolvedIncidents ?? 0,
    };
  }, [liveSosAlerts, reportsOverview.kpis, transformedIncidents.length]);

  return {
    loading,
    me: admin,
    canManageUsers,
    canManageAdmins,
    incidents: transformedIncidents,
    selectedIncident,
    filters: {
      status: statusFilter,
      sortByPriority,
    },
    kpis,
    activeSOS,
    isIncidentsLoading: incidentsQuery.isLoading,
    isSosLoading: sosQuery.isLoading,
    isKpiLoading: reportsQuery.isLoading,
    incidentsError: incidentsQuery.error || null,
    sosError: sosQuery.error || null,
    kpiError: reportsQuery.error || null,
    actions: {
      onSelectIncident: (incident) => setSelectedIncidentId(incident?.id || null),
      onCloseSos: () => setDismissedSosId(activeSOS?.id || null),
      onAcknowledgeSos: async (id) => {
        const sosId = Number(id);
        if (!Number.isFinite(sosId)) return;
        navigate("/sos");
      },
      onDispatchSos: () => {
        navigate("/sos");
      },
      onStatusFilterChange: (value) => setStatusFilter(value),
      onTogglePrioritySort: () => setSortByPriority((prev) => !prev),
      onRetryIncidents: () => incidentsQuery.refetch(),
      onRetrySos: () => sosQuery.refetch(),
      onRetryKpis: () => reportsQuery.refetch(),
      onGoToIncidentWorkspace: () => navigate("/incidents"),
      onGoToSosWorkspace: () => navigate("/sos"),
      onOpenMap: () => navigate("/map"),
      onContactReporter: () => {
        navigate("/incidents");
      },
      onGoToPersonnel: () => navigate("/personnel"),
      onGoToAdmins: () => navigate("/admin-requests"),
    },
  };
}

export default useDashboardController;
