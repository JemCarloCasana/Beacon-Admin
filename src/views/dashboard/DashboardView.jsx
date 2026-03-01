import { Activity, AlertTriangle, CheckCircle2, Radio } from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { ActiveSOSAlert, ActiveIncidentsList, IncidentDetailPanel } from "@/components/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDurationSeconds } from "@/models/reports.model";
import { toIncidentMapMarker } from "@/models/incident.model";
import { getMapStyleConfig } from "@/lib/mapStyle";

function KpiCard({ label, value, icon: Icon }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className="rounded-md bg-slate-100 p-2">
          <Icon className="h-4 w-4 text-slate-700" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardView({
  loading,
  me,
  canManageUsers,
  canManageAdmins,
  canViewIncidents,
  incidents,
  selectedIncident,
  filters,
  kpis,
  activeSOS,
  isIncidentsLoading,
  isSosLoading,
  isKpiLoading,
  incidentsError,
  sosError,
  kpiError,
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

  const mapStyleConfig = getMapStyleConfig();
  const marker = selectedIncident ? toIncidentMapMarker(selectedIncident) : null;

  return (
    <DashboardLayout>
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
          <div>
            Logged in as <span className="font-semibold text-slate-800">{me.full_name}</span> ({me.role})
          </div>

          <div className="flex items-center gap-3">
            <span>
              Avg Response: <span className="font-semibold text-slate-900">{formatDurationSeconds(kpis.avgResponseSeconds)}</span>
            </span>
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

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50/40 px-4 py-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Active Incidents" value={kpis.activeIncidents} icon={AlertTriangle} />
          <KpiCard label="Active SOS" value={kpis.activeSOS} icon={Radio} />
          <KpiCard label="Resolved Incidents" value={kpis.resolvedIncidents} icon={CheckCircle2} />
          <KpiCard label="Avg Response" value={formatDurationSeconds(kpis.avgResponseSeconds)} icon={Activity} />
        </div>

        {kpiError && (
          <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
            <span>{kpiError?.message || "Failed to load dashboard KPIs."}</span>
            <Button size="sm" variant="outline" onClick={actions.onRetryKpis}>Retry</Button>
          </div>
        )}

        {isKpiLoading && !kpiError && (
          <div className="border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">Refreshing KPI data...</div>
        )}

        <ActiveSOSAlert
          alert={activeSOS}
          loading={isSosLoading}
          error={sosError}
          onRetry={actions.onRetrySos}
          onAcknowledge={actions.onAcknowledgeSos}
          onDispatch={actions.onDispatchSos}
          onClose={actions.onCloseSos}
          onGoToSosWorkspace={actions.onGoToSosWorkspace}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full w-[40%] min-w-[380px] flex-col overflow-hidden border-r bg-white">
            <ActiveIncidentsList
              incidents={incidents}
              selectedId={selectedIncident?.id}
              statusFilter={filters.status}
              sortByPriority={filters.sortByPriority}
              loading={isIncidentsLoading}
              error={incidentsError}
              onRetry={actions.onRetryIncidents}
              onStatusFilterChange={actions.onStatusFilterChange}
              onTogglePrioritySort={actions.onTogglePrioritySort}
              onSelect={actions.onSelectIncident}
            />
            {!canViewIncidents && (
              <div className="p-4 text-xs text-slate-500">You do not have permission to view incidents.</div>
            )}
          </div>

          <div className="flex h-full flex-1 flex-col overflow-hidden bg-slate-50/30">
            <IncidentDetailPanel
              incident={selectedIncident && canViewIncidents ? selectedIncident : null}
              mapState={{
                hasValidMap: mapStyleConfig.isValid,
                error: !mapStyleConfig.isValid
                  ? mapStyleConfig.error
                  : !marker
                    ? "No valid coordinates to display on map."
                    : null,
                marker,
              }}
              actions={{
                onGoToIncidentWorkspace: actions.onGoToIncidentWorkspace,
                onOpenMap: actions.onOpenMap,
                onContactReporter: actions.onContactReporter,
              }}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
