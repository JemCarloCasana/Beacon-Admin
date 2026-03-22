import { format } from "date-fns";
import {
  Clock3,
  MapPin,
  Phone,
  ShieldAlert,
  X,
} from "lucide-react";
import MapCanvas from "@/components/map/MapCanvas";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toSosDetailViewModel } from "@/models/sos-detail.model";

const statusStyles = {
  needs_attention: "bg-emergency text-emergency-foreground pulse-emergency",
  active: "bg-info text-info-foreground",
  acknowledged: "bg-warning text-warning-foreground",
  cancelled: "bg-warning text-warning-foreground",
  resolved: "bg-success text-success-foreground",
};

function formatLocation(location) {
  if (location?.address) return location.address;
  if (Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)) {
    return `Lat ${location.latitude.toFixed(5)}, Lng ${location.longitude.toFixed(5)}`;
  }
  return "Location unavailable";
}

function formatEventDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "MMM d, yyyy h:mm a");
}

function formatShortDate(value) {
  if (!value) return "No update";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No update";
  return format(date, "MMM d, yyyy '|' h:mm a");
}

function formatEmergencyLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === "unknown") return "Emergency Alert";
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)} Emergency`;
}

function formatCoordinate(value, suffix) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.abs(value).toFixed(4)} deg ${suffix}`;
}

function getInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";
}

function toMapMarker(detail) {
  if (!Number.isFinite(detail?.location?.latitude) || !Number.isFinite(detail?.location?.longitude)) {
    return null;
  }

  return {
    id: `sos-${detail.id || "unknown"}`,
    type: "sos",
    title: detail.userName,
    lat: detail.location.latitude,
    lng: detail.location.longitude,
  };
}

export function LiveSOSDetailsDialog({
  open,
  onOpenChange,
  detailQuery,
  detailOverride = null,
  onMarkResolved,
}) {
  const detail = detailQuery?.data ? { ...toSosDetailViewModel(detailQuery.data), ...(detailOverride || {}) } : null;
  const mapMarker = detail ? toMapMarker(detail) : null;
  const canMarkResolved = detail && !["resolved", "cancelled"].includes(String(detail?.status || "").toLowerCase());
  const detailBadge = (() => {
    const status = String(detail?.status || "").toLowerCase();
    if (detail?.requires_attention === true) return { key: "needs_attention", label: "Needs Attention" };
    if (status === "active") return { key: "acknowledged", label: "Acknowledged" };
    if (status === "cancelled") return { key: "cancelled", label: detail?.terminal_label || detail?.terminalLabel || "Cancelled SOS" };
    if (status === "resolved") return { key: "resolved", label: detail?.terminal_label || detail?.terminalLabel || "Resolved" };
    return { key: "active", label: status ? status.toUpperCase() : "Active" };
  })();
  const senderNotificationMessage = (() => {
    const status = String(detail?.status || "").toLowerCase();
    if (status === "cancelled" || status === "resolved") {
      return "Resolved and cancelled SOS outcomes notify accepted Beacon friends after the admin update is recorded.";
    }
    if (detail?.acknowledged_at || status === "active") {
      return "Acknowledged SOS updates notify accepted Beacon friends, and they may also see the assigned unit when available.";
    }
    return "Friend-side SOS notifications are best-effort and do not change the admin result shown here.";
  })();
  const summaryTitle = detail?.assigned_unit || formatEmergencyLabel(detail?.emergencyType);
  const coordinatesLabel = Number.isFinite(detail?.location?.latitude) && Number.isFinite(detail?.location?.longitude)
    ? `${formatCoordinate(detail.location.latitude, detail.location.latitude >= 0 ? "N" : "S")} | ${formatCoordinate(detail.location.longitude, detail.location.longitude >= 0 ? "E" : "W")}`
    : "Coordinates unavailable";
  const trackingLabel = mapMarker ? "Tracking Active" : "Tracking Unavailable";
  const timelineDotStyles = {
    Created: "bg-primary",
    Active: "bg-info",
    Acknowledged: "bg-warning",
    Responding: "bg-info",
    Resolved: "bg-success",
    Cancelled: "bg-warning",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl gap-0 overflow-hidden border-border/70 bg-gradient-to-br from-background via-background to-accent/20 p-0 shadow-2xl">
        <div className="border-b bg-card/90 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Emergency Response Details</DialogTitle>
                  <DialogDescription>Beacon SOS operations view with caller, map, and response timeline.</DialogDescription>
                </div>
              </div>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
                <span className="sr-only">Close</span>
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </div>

        {detailQuery?.isLoading && (
          <Alert className="m-6">
            <AlertDescription>Loading SOS details...</AlertDescription>
          </Alert>
        )}

        {detailQuery?.isError && (
          <Alert variant="destructive" className="m-6">
            <AlertDescription>{detailQuery?.error?.message || "Failed to load SOS details."}</AlertDescription>
          </Alert>
        )}

        {!detailQuery?.isLoading && !detailQuery?.isError && !detail && (
          <Alert className="m-6">
            <AlertDescription>No SOS detail available.</AlertDescription>
          </Alert>
        )}

        {detail && (
          <ScrollArea className="h-[80vh]">
            <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
              <div className="space-y-5">
                <section className="rounded-3xl border bg-card/95 p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusStyles[detailBadge.key] || statusStyles.active}>
                          {detailBadge.label}
                        </Badge>
                        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-[11px] uppercase tracking-[0.18em] text-primary">
                          ID: SOS-{detail.id || "-"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Response Unit
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                          {summaryTitle}
                        </h2>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Incident Time
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{formatEventDate(detail.timestamp)}</p>
                      {detail.acknowledged_at && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Acknowledged: {formatShortDate(detail.acknowledged_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-[minmax(260px,0.78fr)_minmax(0,1.22fr)]">
                  <section className="rounded-3xl border bg-card/95 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Caller Profile
                    </p>
                    <div className="mt-3 flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-semibold text-primary">
                        {getInitials(detail.userName)}
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <div>
                          <p className="font-semibold text-foreground">{detail.userName}</p>
                          {detail.role && <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{detail.role}</p>}
                        </div>
                        <div className="space-y-1.5 text-sm">
                          {detail.userPhone && (
                            <div className="flex items-center gap-2 text-foreground">
                              <Phone className="h-4 w-4 text-primary" />
                              <span>{detail.userPhone}</span>
                            </div>
                          )}
                          {!detail.userPhone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>No phone number available</span>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">SOS ID: {detail.id || "-"}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-3xl border bg-card/95 p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Incident Specs
                    </p>
                    <div className="mt-4 space-y-4">
                      <div className="flex items-start gap-3 rounded-2xl bg-muted/35 p-3">
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emergency/10 text-emergency">
                          <ShieldAlert className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">Type</p>
                          <p className="mt-1 font-semibold text-foreground">{formatEmergencyLabel(detail.emergencyType)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-2xl bg-muted/35 p-3">
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">Coordinates</p>
                          <p className="mt-1 font-semibold text-foreground">{coordinatesLabel}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{formatLocation(detail.location)}</p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <section className="overflow-hidden rounded-3xl border bg-card/95 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Live Location
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">Latest map position and GPS context for this SOS thread.</p>
                    </div>
                    <Badge variant="outline" className={cn(
                      "rounded-full border text-[11px] uppercase tracking-[0.18em]",
                      mapMarker ? "border-primary/20 bg-primary/5 text-primary" : "border-border bg-muted/40 text-muted-foreground"
                    )}>
                      {trackingLabel}
                    </Badge>
                  </div>
                  {mapMarker ? (
                    <MapCanvas
                      markers={[mapMarker]}
                      selectedMarker={mapMarker}
                      heightClassName="h-[360px]"
                    />
                  ) : (
                    <div className="flex h-[360px] items-center justify-center bg-muted/20 px-6 text-sm text-muted-foreground">
                      No valid coordinates to display on map.
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-3.5 w-3.5" />
                      <span>Last GPS update: {formatShortDate(detail.timestamp)}</span>
                    </div>
                    <span>{coordinatesLabel}</span>
                  </div>
                </section>

                <section className="rounded-3xl border bg-card/95 p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Beacon Update Rules
                  </p>
                  <p className="mt-3 rounded-2xl bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
                    {senderNotificationMessage}
                  </p>
                  {canMarkResolved && (
                    <div className="mt-4 flex justify-end">
                      <Button size="lg" className="min-w-[200px] rounded-2xl" onClick={() => onMarkResolved?.(detail)}>
                        Mark Resolved
                      </Button>
                    </div>
                  )}
                </section>
              </div>

              <aside className="rounded-3xl border bg-card/95 shadow-sm">
                <div className="border-b px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Activity Timeline
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">Operational updates recorded for this SOS thread.</p>
                </div>
                <div className="px-5 py-4">
                  {detail.timeline.length === 0 && (
                    <div className="rounded-2xl bg-muted/35 px-4 py-6 text-sm text-muted-foreground">
                      No timeline events found.
                    </div>
                  )}
                  <div className="space-y-6">
                    {detail.timeline.map((event, index) => {
                      const label = event?.eventLabel || String(event?.status || "active").toUpperCase();
                      return (
                        <div key={event.id || `${event.created_at}-${event.status}`} className="relative pl-8 text-sm">
                          {index < detail.timeline.length - 1 && (
                            <div className="absolute left-[11px] top-6 h-[calc(100%+1.25rem)] w-px bg-border" />
                          )}
                          <div className={cn(
                            "absolute left-0 top-1 h-[22px] w-[22px] rounded-full border-4 border-background shadow-sm",
                            timelineDotStyles[label] || "bg-primary"
                          )} />
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">{label}</p>
                              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                                {event?.actorLabel || "User"}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatEventDate(event?.created_at)}
                            </span>
                          </div>
                          {event?.message && <p className="mt-2 text-muted-foreground">{event.message}</p>}
                          <p className="mt-2 text-xs text-muted-foreground">
                            {formatLocation({
                              latitude: event?.latitude,
                              longitude: event?.longitude,
                              address: event?.address,
                            })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </aside>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
