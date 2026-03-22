import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { useIncidentDetail, useUpdateIncident } from "@/api/useIncidentsAPI";
import MapCanvas from "@/components/map/MapCanvas";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_CONFIG, STATUS_CONFIG, CATEGORY_CONFIG } from "@/config/constants";
import { useToast } from "@/hooks/use-toast";
import { toIncidentMapMarker, toIncidentViewModel } from "@/models/incident.model";
import { ProtectedIncidentImage } from "@/components/ProtectedIncidentImage";
import { TimelineLog } from "@/components/incidents/TimelineLog";

const STATUS_FLOW = ["pending", "dispatched", "in_progress", "resolved"];
const PRIORITY_FLOW = ["critical", "high", "medium", "low"];
const ASSIGN_DEPARTMENT_OPTIONS = [
  "Emergency Medical Unit",
  "Fire Station Unit",
  "Police Personnel",
  "Traffic Enforcement Unit",
];
const UNASSIGNED_DEPARTMENT_VALUE = "__unassigned__";
const AUTO_PRIORITY_BY_INCIDENT_TYPE = {
  medical_emergency: "critical",
  fire: "critical",
  accident: "high",
  suspicious_activity: "medium",
  harassment: "medium",
  theft: "medium",
};
const AUTO_ASSIGNED_DEPARTMENT_BY_INCIDENT_TYPE = {
  medical_emergency: "Emergency Medical Unit",
  fire: "Fire Station Unit",
  accident: "Traffic Enforcement Unit",
  suspicious_activity: "Police Personnel",
  harassment: "Police Personnel",
  theft: "Police Personnel",
};

function formatCoordinates(location) {
  if (!Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)) return "-";
  return `Lat ${location.latitude.toFixed(5)}, Lng ${location.longitude.toFixed(5)}`;
}

function getIncidentTypeLabel(value) {
  if (!value) return "Other";
  return CATEGORY_CONFIG[value]?.label || value;
}

function getPriorityLabel(value) {
  return PRIORITY_CONFIG[value]?.label || "Unknown";
}

function getStatusLabel(value) {
  return STATUS_CONFIG[value]?.label || "Unknown";
}

function normalizeIncidentType(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getStatusErrorMessage(statusCode, fallback) {
  if (statusCode === 400) return "400 Bad Request: Invalid incident update input.";
  if (statusCode === 403) return "403 Forbidden: You do not have permission to manage incidents.";
  if (statusCode === 404) return "404 Not Found: Incident not found.";
  if (statusCode === 409) return "409 Conflict: Invalid status transition.";
  return fallback || "Failed to update incident.";
}

function getDetailErrorMessage(statusCode, fallback) {
  if (statusCode === 403) return "403 Forbidden: You do not have permission to view this incident.";
  if (statusCode === 404) return "404 Not Found: Incident not found.";
  return fallback || "Failed to load incident details.";
}

export function IncidentDetailsDialog({ open, onOpenChange, incidentId, incidentPreview }) {
  const { toast } = useToast();
  const detailQuery = useIncidentDetail(incidentId, {
    enabled: open && !!incidentId,
  });
  const updateIncidentMutation = useUpdateIncident();
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignedDepartment, setAssignedDepartment] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [imageIndex, setImageIndex] = useState(0);

  const detail = useMemo(
    () => (detailQuery?.data ? toIncidentViewModel(detailQuery.data) : null),
    [detailQuery?.data]
  );
  const preview = useMemo(
    () => (incidentPreview ? toIncidentViewModel(incidentPreview) : null),
    [incidentPreview]
  );
  const incident = useMemo(() => detail || preview, [detail, preview]);
  const marker = incident ? toIncidentMapMarker(incident) : null;
  const incidentStatus = typeof incident?.status === "string" ? incident.status : "";
  const normalizedCurrentStatus = STATUS_FLOW.includes(incidentStatus) ? incidentStatus : null;
  const currentStatusIndex = normalizedCurrentStatus ? STATUS_FLOW.indexOf(normalizedCurrentStatus) : -1;
  const nextAllowedStatus = currentStatusIndex >= 0 ? STATUS_FLOW[currentStatusIndex + 1] || null : null;
  const selectableStatuses = useMemo(() => {
    if (!normalizedCurrentStatus) return STATUS_FLOW;
    return STATUS_FLOW.filter(
      (candidate) => candidate === normalizedCurrentStatus || candidate === nextAllowedStatus
    );
  }, [normalizedCurrentStatus, nextAllowedStatus]);
  const fixedIncidentType = String(incident?.incidentType || incident?.category || "other").trim();
  const normalizedIncidentType = normalizeIncidentType(fixedIncidentType);
  const typeBasedPriority = AUTO_PRIORITY_BY_INCIDENT_TYPE[normalizedIncidentType] || null;
  const typeBasedAssignedDepartment =
    AUTO_ASSIGNED_DEPARTMENT_BY_INCIDENT_TYPE[normalizedIncidentType] || null;
  const isManualPriorityType =
    !typeBasedPriority && (normalizedIncidentType === "other" || normalizedIncidentType === "others");
  const isManualAssignedDepartmentType =
    !typeBasedAssignedDepartment &&
    (normalizedIncidentType === "other" || normalizedIncidentType === "others");
  const currentImageUrl = incident?.imageUrls?.[imageIndex] || incident?.imageUrl || "";

  useEffect(() => {
    if (!open || !incident) return;
    setStatus(normalizedCurrentStatus || "pending");
    setPriority(typeBasedPriority || incident.priority || "medium");
    setAssignedDepartment(typeBasedAssignedDepartment || incident.assignedDepartment || "");
    setResolutionNotes(incident.resolutionNotes || "");
  }, [
    incident?.id,
    incident?.status,
    incident?.priority,
    incident?.assignedDepartment,
    incident?.resolutionNotes,
    normalizedCurrentStatus,
    typeBasedPriority,
    typeBasedAssignedDepartment,
    open,
  ]);

  useEffect(() => {
    setImageIndex(0);
  }, [incident?.id, incident?.imageUrl, incident?.imageUrls]);

  const onSave = async () => {
    if (!incident?.id) return;
    const effectivePriority = typeBasedPriority || priority;
    const effectiveAssignedDepartment = typeBasedAssignedDepartment || assignedDepartment || null;

    if (!PRIORITY_FLOW.includes(effectivePriority)) {
      toast({
        title: "Invalid priority",
        description: "Priority must be one of: critical, high, medium, low.",
        variant: "destructive",
      });
      return;
    }

    if (!STATUS_FLOW.includes(status)) {
      toast({
        title: "Invalid status",
        description: "Status must be one of: pending, dispatched, in_progress, resolved.",
        variant: "destructive",
      });
      return;
    }

    if (!fixedIncidentType) {
      toast({
        title: "Invalid incident type",
        description: "Incident type is required.",
        variant: "destructive",
      });
      return;
    }

    if (normalizedCurrentStatus && status !== normalizedCurrentStatus && status !== nextAllowedStatus) {
      toast({
        title: "Invalid transition",
        description: "Status must follow pending -> dispatched -> in_progress -> resolved.",
        variant: "destructive",
      });
      return;
    }

    if (
      effectiveAssignedDepartment &&
      !ASSIGN_DEPARTMENT_OPTIONS.includes(effectiveAssignedDepartment)
    ) {
      toast({
        title: "Invalid department",
        description: "Assign department must match one of the allowed department options.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateIncidentMutation.mutateAsync({
        id: incident.id,
        status,
        priority: effectivePriority,
        incidentType: fixedIncidentType,
        assignedDepartment: effectiveAssignedDepartment,
        resolutionNotes: resolutionNotes.trim(),
      });

      toast({
        title: "Incident updated",
        description: `Incident #${incident.id} was updated.`,
      });
    } catch (error) {
      const statusCode = Number(error?.status || 0);
      toast({
        title: "Update failed",
        description: getStatusErrorMessage(statusCode, error?.message),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92vh] w-[min(96vw,1100px)] max-w-[1100px] overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{incident?.title || "Incident Details"}</DialogTitle>
          <DialogDescription>
            Incident #{incident?.id || "-"} details and reported location.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
        {detailQuery?.isLoading && (
          <Alert className="mb-4">
            <AlertDescription>Loading incident details...</AlertDescription>
          </Alert>
        )}

        {detailQuery?.isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {getDetailErrorMessage(detailQuery?.error?.status, detailQuery?.error?.message)}
            </AlertDescription>
          </Alert>
        )}

        {!detailQuery?.isLoading && !incident && (
          <Alert>
            <AlertDescription>No incident details available.</AlertDescription>
          </Alert>
        )}

        {incident && (
          <div className="space-y-4">
            {currentImageUrl && (
              <div className="rounded-lg border p-4">
                <div className="mb-2 text-sm font-medium">Image</div>
                <ProtectedIncidentImage
                  key={`${incident.id || "unknown"}-${imageIndex}`}
                  imageUrl={currentImageUrl}
                  alt={`Incident ${incident.id || ""} ${incident.title || "image"}`.trim()}
                  className="h-[220px] w-full rounded-md border object-contain"
                  loadingClassName="flex h-[220px] w-full items-center justify-center rounded-md border bg-muted/20 text-sm text-muted-foreground"
                  fallbackClassName="flex h-[220px] w-full items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground"
                  onLoadError={() => {
                    if (!Array.isArray(incident?.imageUrls)) return;
                    if (imageIndex < incident.imageUrls.length - 1) {
                      setImageIndex((prev) => prev + 1);
                    }
                  }}
                />
              </div>
            )}

            <div className="rounded-lg border p-4">
              <div className="mb-2 text-sm font-medium">Description</div>
              <p className="text-sm">{incident.description || "No description provided."}</p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>Location</span>
              </div>
              <p className="text-sm">{incident.location?.address || "Location unavailable"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatCoordinates(incident.location)}</p>
            </div>

            <div className="rounded-lg border">
              <div className="border-b px-4 py-2 text-sm font-medium">Map</div>
              {marker ? (
                <MapCanvas markers={[marker]} selectedMarker={marker} heightClassName="h-[220px]" />
              ) : (
                <div className="flex h-[220px] items-center justify-center px-4 text-sm text-muted-foreground">
                  No valid coordinates to display on map.
                </div>
              )}
            </div>

            <TimelineLog incident={incident} />

            <div className="rounded-lg border p-4">
              <div className="mb-3 text-sm font-medium">Update Incident</div>
              <div className="mb-3 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Reporter notifications are sent only when status changes to Dispatched, In Progress, or Resolved.
                Editing assignment, priority, or notes alone does not notify the reporter.
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="incident-status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="incident-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_FLOW.map((item) => (
                        <SelectItem
                          key={item}
                          value={item}
                          disabled={!selectableStatuses.includes(item)}
                        >
                          {getStatusLabel(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="incident-priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority} disabled={!isManualPriorityType}>
                    <SelectTrigger id="incident-priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_FLOW.map((item) => (
                        <SelectItem key={item} value={item}>
                          {getPriorityLabel(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isManualPriorityType && typeBasedPriority && (
                    <p className="text-xs text-muted-foreground">
                      Auto-assigned from incident type: {getPriorityLabel(typeBasedPriority)}.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="incident-type">Incident Type</Label>
                  <div
                    id="incident-type"
                    className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground"
                  >
                    {getIncidentTypeLabel(fixedIncidentType)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="incident-assigned-department">Assign Department</Label>
                  <Select
                    value={assignedDepartment || UNASSIGNED_DEPARTMENT_VALUE}
                    disabled={!isManualAssignedDepartmentType}
                    onValueChange={(value) =>
                      setAssignedDepartment(
                        value === UNASSIGNED_DEPARTMENT_VALUE ? "" : value
                      )
                    }
                  >
                    <SelectTrigger id="incident-assigned-department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED_DEPARTMENT_VALUE}>Unassigned</SelectItem>
                      {ASSIGN_DEPARTMENT_OPTIONS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isManualAssignedDepartmentType && typeBasedAssignedDepartment && (
                    <p className="text-xs text-muted-foreground">
                      Auto-assigned from incident type: {typeBasedAssignedDepartment}.
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="incident-resolution-notes">Resolution Notes</Label>
                  <Textarea
                    id="incident-resolution-notes"
                    value={resolutionNotes}
                    onChange={(event) => setResolutionNotes(event.target.value)}
                    placeholder="Add notes for dispatch/progress/resolution updates"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button onClick={onSave} disabled={updateIncidentMutation.isPending || !incident?.id}>
                  {updateIncidentMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
