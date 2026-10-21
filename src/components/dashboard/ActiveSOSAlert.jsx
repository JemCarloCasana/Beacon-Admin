import { useState } from "react";
import { Siren, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataState } from "@/components/common/DataState";
import { ElapsedTimer } from "@/components/common/ElapsedTimer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RESPONSE_UNITS, UNKNOWN_EMERGENCY_LABEL, emergencyLabel, unitForEmergencyCategory } from "@/config/emergency";

function resolveLocation(alert) {
  if (typeof alert?.location === "string") return alert.location;
  if (alert?.location?.address) return alert.location.address;
  return "Location unavailable";
}

export function ActiveSOSAlert({
  alert,
  loading = false,
  error = null,
  onRetry,
  onDispatch,
  onAssignUnit,
  onOpenDetails,
  onClose,
}) {
  const [isChoosingUnit, setIsChoosingUnit] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("");

  const status = loading ? "loading" : error ? "error" : alert ? "live" : "empty";
  const assignedUnit = unitForEmergencyCategory(alert?.emergencyType);
  const reportedLabel = alert?.emergencyType
    ? emergencyLabel(alert.emergencyType)
    : UNKNOWN_EMERGENCY_LABEL;

  const handleAssign = () => {
    if (!selectedUnit || !alert) return;
    onAssignUnit?.(alert.id, selectedUnit);
    setSelectedUnit("");
    setIsChoosingUnit(false);
  };

  return (
    <DataState
      status={status}
      error={error}
      onRetry={onRetry}
      emptyTitle="No SOS alerts requiring immediate attention."
      emptyDescription="The live queue is empty. New emergencies appear here as soon as they are sent."
      skeleton={<div className="h-24 animate-pulse rounded-md bg-muted" />}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-l-4 border-l-emergency bg-emergency/10 p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emergency/20 text-emergency">
            <Siren className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emergency">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emergency opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emergency" />
              </span>
              ACTIVE SOS
              <ElapsedTimer since={alert?.timestamp} className="text-emergency" />
            </div>
            <h3 className="text-base font-semibold leading-tight text-foreground">
              {alert?.name || "Unknown User"}
            </h3>
            <p className="text-xs font-medium text-muted-foreground">{reportedLabel}</p>
            <p className="text-xs font-medium text-muted-foreground">{resolveLocation(alert)}</p>
            {alert?.description && (
              <p className="mt-1 text-sm italic font-medium text-foreground">"{alert.description}"</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {assignedUnit ? (
            <Button
              onClick={() => onDispatch?.(alert.id)}
              className="h-9 bg-emergency px-5 font-semibold text-emergency-foreground hover:bg-emergency/90"
            >
              Assign {assignedUnit}
            </Button>
          ) : (
            <Button
              onClick={() => setIsChoosingUnit((previous) => !previous)}
              className="h-9 bg-emergency px-5 font-semibold text-emergency-foreground hover:bg-emergency/90"
            >
              Choose unit
            </Button>
          )}

          {isChoosingUnit && !assignedUnit && (
            <div className="flex items-center gap-2">
              <Label htmlFor="sos-assign-unit" className="sr-only">
                Responding unit
              </Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger id="sos-assign-unit" className="h-9 w-56">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSE_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAssign} disabled={!selectedUnit} className="h-9">
                Assign
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => onOpenDetails?.(alert.id)}
            className="h-9 border-border font-semibold text-muted-foreground hover:bg-accent"
          >
            Open details
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Dismiss alert"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </DataState>
  );
}
