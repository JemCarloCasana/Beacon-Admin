import { useEffect, useRef } from "react";
import { CalendarClock, ExternalLink, Phone, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import MapCanvas from "@/components/map/MapCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "@/config/constants";

const priorityStyles = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-warning text-warning-foreground",
  medium: "bg-caution text-caution-foreground",
  low: "bg-muted text-muted-foreground",
  unknown: "bg-muted text-muted-foreground",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
}

function formatCoordinates(location) {
  if (!Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)) {
    return "—";
  }
  return `Lat ${location.latitude.toFixed(5)}, Lng ${location.longitude.toFixed(5)}`;
}

export function IncidentDetailPanel({ incident, mapState, actions }) {
  const bodyRef = useRef(null);

  // A new incident must start at the top, not wherever the last one was read to.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [incident?.id]);

  if (!incident) {
    return (
      <div className="flex flex-1 items-center justify-center border-l bg-card p-8 text-sm text-muted-foreground">
        Select an incident to view details.
      </div>
    );
  }

  const priority = incident.priority || "unknown";
  const priorityLabel = incident.priorityLabel || PRIORITY_CONFIG[priority]?.label || priority;

  return (
    <div className="flex h-full flex-col overflow-hidden border-l bg-card">
      <div className="shrink-0 space-y-4 p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Incident #{incident.id || "—"}
          </p>
          <h2 className="text-xl font-semibold text-foreground">{incident.title || "Untitled Incident"}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={priorityStyles[priority] || priorityStyles.unknown}>
              {priorityLabel}
            </Badge>
            <Badge variant="outline">{incident.statusLabel || STATUS_CONFIG[incident.status]?.label || "Unknown"}</Badge>
            <Badge variant="outline">{incident.categoryLabel || "Other"}</Badge>
          </div>
          {!incident.priority && incident.priorityProposal && (
            <p className="text-xs text-muted-foreground">
              Suggested for this incident type: {PRIORITY_CONFIG[incident.priorityProposal]?.label || incident.priorityProposal}.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button className="gap-2" onClick={actions?.onGoToIncidentWorkspace}>
            <Send className="h-4 w-4" />
            Open incident
          </Button>
          <Button variant="outline" className="gap-2" onClick={actions?.onContactReporter}>
            <Phone className="h-4 w-4" />
            Contact Reporter
          </Button>
        </div>
      </div>

      <Separator className="bg-border" />

      <div ref={bodyRef} className="flex-1 space-y-6 overflow-y-auto p-5" aria-live="polite">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Location
          </h3>
          <div className="mb-3 rounded-md border border-border bg-muted/40 p-3">
            <p className="text-sm font-medium text-foreground">{incident.address || "Address unavailable"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatCoordinates(incident.location)}</p>
          </div>

          {mapState?.hasValidMap && mapState?.marker ? (
            <div className="overflow-hidden rounded-lg border">
              <MapCanvas markers={[mapState.marker]} selectedMarker={mapState.marker} heightClassName="h-[220px]" />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">
                {mapState?.error || "Map is unavailable. Open Map View for full context."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-2"
                onClick={actions?.onOpenMap}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open map
              </Button>
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Operational Details
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Assigned response unit</p>
              <p className="mt-1 font-semibold text-foreground">
                {incident.assignedDepartment || "Unassigned"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Reported by</p>
              <p className="mt-1 font-semibold text-foreground">
                {incident.reporter?.name || "Unknown user"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Created</p>
              <p className="mt-1 font-semibold text-foreground">{formatDate(incident.createdAt)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Updated</p>
              <p className="mt-1 font-semibold text-foreground">{formatDate(incident.updatedAt)}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Description
          </h3>
          <div className="rounded-md border p-3 text-sm text-foreground">
            {incident.description || "No dispatcher notes available."}
          </div>
          <div className="mt-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
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
