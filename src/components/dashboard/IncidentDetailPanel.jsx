import { CalendarClock, ExternalLink, Phone, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import MapCanvas from "@/components/map/MapCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return formatDistanceToNow(date, { addSuffix: true });
}

function formatCoordinates(location) {
  if (!Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)) {
    return "Coordinates unavailable";
  }
  return `Lat ${location.latitude.toFixed(5)}, Lng ${location.longitude.toFixed(5)}`;
}

export function IncidentDetailPanel({ incident, mapState, actions }) {
  if (!incident) {
    return (
      <div className="flex flex-1 items-center justify-center border-l bg-white p-8 text-sm text-slate-500">
        Select an incident to view details.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto border-l bg-white">
      <div className="space-y-4 p-5">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Incident #{incident.id || "-"}
          </p>
          <h2 className="text-xl font-semibold text-slate-900">{incident.title || "Untitled Incident"}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-slate-900 text-white hover:bg-slate-900">
              {(incident.priority || "unknown").toUpperCase()}
            </Badge>
            <Badge variant="outline">{incident.statusLabel || incident.status || "Unknown"}</Badge>
            <Badge variant="outline">{incident.categoryLabel || "Other"}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button className="gap-2" onClick={actions?.onGoToIncidentWorkspace}>
            <Send className="h-4 w-4" />
            Open Incident Workspace
          </Button>
          <Button variant="outline" className="gap-2" onClick={actions?.onContactReporter}>
            <Phone className="h-4 w-4" />
            Contact Reporter
          </Button>
        </div>
      </div>

      <Separator className="bg-slate-100" />

      <div className="space-y-6 p-5">
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Location
          </h3>
          <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-900">{incident.address || "Address unavailable"}</p>
            <p className="mt-1 text-xs text-slate-500">{formatCoordinates(incident.location)}</p>
          </div>

          {mapState?.hasValidMap && mapState?.marker ? (
            <div className="overflow-hidden rounded-lg border">
              <MapCanvas markers={[mapState.marker]} selectedMarker={mapState.marker} heightClassName="h-[220px]" />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-xs text-slate-600">
                {mapState?.error || "Map is unavailable. Open Map View for full context."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-2"
                onClick={actions?.onOpenMap}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Map View
              </Button>
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Operational Details
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-md border p-3">
              <p className="text-slate-500">Assigned Department</p>
              <p className="mt-1 font-semibold text-slate-900">
                {incident.assignedDepartment || "Unassigned"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-slate-500">Reported By User ID</p>
              <p className="mt-1 font-semibold text-slate-900">
                {incident.reportedByUserId || "-"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-slate-500">Created</p>
              <p className="mt-1 font-semibold text-slate-900">{formatDate(incident.createdAt)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-slate-500">Updated</p>
              <p className="mt-1 font-semibold text-slate-900">{formatDate(incident.updatedAt)}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Notes
          </h3>
          <div className="rounded-md border p-3 text-sm text-slate-700">
            {incident.description || "No dispatcher notes available."}
          </div>
          <div className="mt-2 rounded-md border bg-slate-50 p-3 text-xs text-slate-600">
            <p className="flex items-center gap-1.5 font-medium">
              <CalendarClock className="h-3.5 w-3.5" />
              Resolution Notes
            </p>
            <p className="mt-1">{incident.resolutionNotes || "No resolution notes yet."}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
