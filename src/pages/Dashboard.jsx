import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout";
import { ActiveSOSAlert, ActiveIncidentsList, IncidentDetailPanel } from "@/components/dashboard";
import { useIncidents } from "@/hooks/useIncidents";
import { useSOS } from "@/hooks/useSOS";
import { formatDistanceToNow } from "date-fns";
import { useAdminAuth } from "@/auth/AdminAuthProvider";

export default function Dashboard() {
  const navigate = useNavigate();

  // ✅ Global auth state (single source of truth)
  const { me, loading } = useAdminAuth();

  const { incidents = [] } = useIncidents();
  const { activeAlerts = [], acknowledgeAlert } = useSOS();

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [sosClosed, setSosClosed] = useState(false);

  // ✅ Permissions from me (directly)
  const permissions = me?.permissions ?? [];
  const canManageIncidents = permissions.includes("manage_incidents");
  const canViewIncidents = permissions.includes("view_incidents") || canManageIncidents;
  const canManageUsers = permissions.includes("manage_users");
  const canManageAdmins = permissions.includes("manage_admins");

  // ✅ Debug: confirm what the UI receives
  useEffect(() => {
    if (!loading && me) {
      console.log("[debug] me.role:", me.role);
      console.log("[debug] permissions:", permissions);
      console.log("[debug] canManageUsers:", canManageUsers);
    }
  }, [loading, me, canManageUsers, permissions]);

  // Transform incidents for the list
  const transformedIncidents = useMemo(() => {
    if (!Array.isArray(incidents)) return [];
    return incidents.map((inc) => {
      try {
        const date = inc.createdAt ? new Date(inc.createdAt) : new Date();
        return {
          ...inc,
          timeAgo: formatDistanceToNow(date, { addSuffix: true }).replace("about ", ""),
          categoryLabel: inc.title?.split(" - ")[1] || inc.title || "Incident",
          address: inc.location?.address || "Location unavailable",
          statusLabel:
            (inc.status || "pending").charAt(0).toUpperCase() +
            (inc.status || "pending").slice(1).replace("_", " "),
        };
      } catch (err) {
        console.error("Error transforming incident:", inc, err);
        return {
          ...inc,
          timeAgo: "recently",
          categoryLabel: inc.title || "Incident",
          address: "Location unavailable",
          statusLabel: "Pending",
        };
      }
    });
  }, [incidents]);

  // Handle initial selection
  useEffect(() => {
    if (!selectedIncident && transformedIncidents.length > 0) {
      setSelectedIncident(transformedIncidents[0]);
    }
  }, [transformedIncidents, selectedIncident]);

  const activeSOS = activeAlerts.length > 0 ? activeAlerts[0] : null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 text-sm text-slate-500">Loading session…</div>
      </DashboardLayout>
    );
  }

  if (!me) return null;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full w-full overflow-hidden">
        {/* Header/meta */}
        <div className="px-4 pt-4 pb-2 text-xs text-slate-500 flex items-center justify-between">
          <div>
            Logged in as <span className="font-semibold text-slate-700">{me.full_name}</span> ({me.role})
          </div>

          {/* Quick actions */}
          <div className="flex gap-2">
            {canManageUsers && (
              <button
                className="text-[11px] font-semibold text-blue-700 hover:underline"
                onClick={() => navigate("/users")}
              >
                Manage Users
              </button>
            )}
            {canManageAdmins && (
              <button
                className="text-[11px] font-semibold text-blue-700 hover:underline"
                onClick={() => navigate("/admins")}
              >
                Manage Admins
              </button>
            )}
          </div>
        </div>

        {/* Active SOS Alert Bar */}
        {activeSOS && !sosClosed && (
          <ActiveSOSAlert
            alert={{
              ...activeSOS,
              timestamp: activeSOS.timestamp
                ? formatDistanceToNow(new Date(activeSOS.timestamp), { addSuffix: true }).replace("about ", "")
                : "2m ago",
              description: activeSOS.message || "SOS Alert",
            }}
            onAcknowledge={(id) => acknowledgeAlert(id, String(me.id))}
            onDispatch={(id) => {
              if (!canManageIncidents) return;
              console.log("Dispatch SOS", id);
            }}
            onClose={() => setSosClosed(true)}
          />
        )}

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left: Incidents List */}
          <div className="w-[45%] lg:w-[40%] xl:w-[35%] h-full border-r overflow-hidden flex flex-col">
            <ActiveIncidentsList
              incidents={canViewIncidents ? transformedIncidents : []}
              selectedId={selectedIncident?.id}
              onSelect={setSelectedIncident}
            />
            {!canViewIncidents && (
              <div className="p-4 text-xs text-slate-500">You don’t have permission to view incidents.</div>
            )}
          </div>

          {/* Right: Incident Details */}
          <div className="flex-1 h-full bg-slate-50/30 overflow-hidden flex flex-col">
            <IncidentDetailPanel
              incident={
                selectedIncident && canViewIncidents
                  ? {
                      ...selectedIncident,
                      categoryLabel: selectedIncident.categoryLabel,
                      reportedBy: "John Doe",
                      assignedUnit: "Amb-01",
                    }
                  : null
              }
            />
            {canViewIncidents && !selectedIncident && (
              <div className="p-6 text-sm text-slate-500">Select an incident to view details.</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
