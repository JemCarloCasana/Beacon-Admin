import { DashboardLayout } from "@/components/layout";
import { ActiveSOSAlert, ActiveIncidentsList, IncidentDetailPanel } from "@/components/dashboard";

export default function DashboardView({
  loading,
  me,
  canManageUsers,
  canManageAdmins,
  canViewIncidents,
  incidents,
  selectedIncident,
  activeSOS,
  sosClosed,
  actions,
}) {
  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 text-sm text-slate-500">Loading session...</div>
      </DashboardLayout>
    );
  }

  if (!me) return null;

  return (
    <DashboardLayout>
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 pb-2 pt-4 text-xs text-slate-500">
          <div>
            Logged in as <span className="font-semibold text-slate-700">{me.full_name}</span> ({me.role})
          </div>

          <div className="flex gap-2">
            {canManageUsers && (
              <button
                className="text-[11px] font-semibold text-blue-700 hover:underline"
                onClick={actions.onGoToPersonnel}
              >
                Manage Users
              </button>
            )}
            {canManageAdmins && (
              <button
                className="text-[11px] font-semibold text-blue-700 hover:underline"
                onClick={actions.onGoToAdmins}
              >
                Manage Admins
              </button>
            )}
          </div>
        </div>

        {activeSOS && !sosClosed && (
          <ActiveSOSAlert
            alert={activeSOS}
            onAcknowledge={actions.onAcknowledgeSos}
            onDispatch={actions.onDispatchSos}
            onClose={actions.onCloseSos}
          />
        )}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full w-[45%] flex-col overflow-hidden border-r lg:w-[40%] xl:w-[35%]">
            <ActiveIncidentsList
              incidents={incidents}
              selectedId={selectedIncident?.id}
              onSelect={actions.onSelectIncident}
            />
            {!canViewIncidents && (
              <div className="p-4 text-xs text-slate-500">You do not have permission to view incidents.</div>
            )}
          </div>

          <div className="flex h-full flex-1 flex-col overflow-hidden bg-slate-50/30">
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

