import { format } from "date-fns";
import { MapPin, Phone, ShieldAlert, User } from "lucide-react";
import MapCanvas from "@/components/map/MapCanvas";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toSosDetailViewModel } from "@/models/sos-detail.model";

const statusStyles = {
  active: "bg-emergency text-emergency-foreground",
  acknowledged: "bg-warning text-warning-foreground",
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

function toActorLabel(event) {
  if (event?.actor_type === "admin") return "Admin";
  if (event?.actor_type === "system") return "System";
  return "User";
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

export function LiveSOSDetailsDialog({ open, onOpenChange, detailQuery }) {
  const detail = detailQuery?.data ? toSosDetailViewModel(detailQuery.data) : null;
  const mapMarker = detail ? toMapMarker(detail) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>SOS Details</DialogTitle>
          <DialogDescription>Thread details, sender profile, and location timeline.</DialogDescription>
        </DialogHeader>

        {detailQuery?.isLoading && (
          <Alert>
            <AlertDescription>Loading SOS details...</AlertDescription>
          </Alert>
        )}

        {detailQuery?.isError && (
          <Alert variant="destructive">
            <AlertDescription>{detailQuery?.error?.message || "Failed to load SOS details."}</AlertDescription>
          </Alert>
        )}

        {!detailQuery?.isLoading && !detailQuery?.isError && !detail && (
          <Alert>
            <AlertDescription>No SOS detail available.</AlertDescription>
          </Alert>
        )}

        {detail && (
          <ScrollArea className="h-[68vh] pr-4">
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Badge className={statusStyles[detail.status] || statusStyles.active}>
                    {detail.status.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">SOS #{detail.id || "-"}</span>
                  <span className="text-xs text-muted-foreground">{formatEventDate(detail.timestamp)}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{detail.userName}</span>
                  </div>
                  {detail.userPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{detail.userPhone}</span>
                    </div>
                  )}
                  {detail.role && <p className="text-muted-foreground">Role: {detail.role}</p>}
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    <span>Emergency Type: {detail.emergencyType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{formatLocation(detail.location)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border">
                <div className="border-b px-4 py-2 text-sm font-medium">Current Location</div>
                {mapMarker ? (
                  <MapCanvas
                    markers={[mapMarker]}
                    selectedMarker={mapMarker}
                    heightClassName="h-[280px]"
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                    No valid coordinates to display on map.
                  </div>
                )}
              </div>

              <div className="rounded-lg border">
                <div className="border-b px-4 py-2 text-sm font-medium">Timeline</div>
                <div className="divide-y">
                  {detail.timeline.length === 0 && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No timeline events found.</div>
                  )}
                  {detail.timeline.map((event) => (
                    <div key={event.id || `${event.created_at}-${event.status}`} className="px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{String(event?.status || "active").toUpperCase()}</Badge>
                          <span className="text-xs text-muted-foreground">{toActorLabel(event)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatEventDate(event?.created_at)}</span>
                      </div>
                      {event?.message && <p className="mt-2 text-muted-foreground">{event.message}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatLocation({
                          latitude: event?.latitude,
                          longitude: event?.longitude,
                          address: event?.address,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

