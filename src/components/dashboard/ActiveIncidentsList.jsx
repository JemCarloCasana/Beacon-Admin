import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "@/config/constants";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: config?.label || value,
  })),
];

const priorityStyles = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-warning text-warning-foreground",
  medium: "bg-caution text-caution-foreground",
  low: "bg-muted text-muted-foreground",
  unknown: "bg-muted text-muted-foreground",
};

const statusStyles = {
  pending: "bg-muted text-muted-foreground",
  dispatched: "bg-info text-info-foreground",
  in_progress: "bg-warning text-warning-foreground",
  resolved: "bg-success text-success-foreground",
  closed: "bg-muted text-muted-foreground",
  unknown: "bg-muted text-muted-foreground",
};

export function ActiveIncidentsList({
  incidents,
  selectedId,
  statusFilter = "all",
  sortByPriority = true,
  loading = false,
  error = null,
  onRetry,
  onStatusFilterChange,
  onTogglePrioritySort,
  onSelect,
}) {
  return (
    <div className="flex h-full flex-col bg-card">
      <div className="space-y-3 border-b border-border p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Active Incidents
            <span className="ml-2 text-xs font-medium text-muted-foreground">({incidents.length})</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="incident-status-filter" className="sr-only">
            Filter incidents by status
          </Label>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger id="incident-status-filter" className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={sortByPriority ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={onTogglePrioritySort}
            aria-pressed={sortByPriority}
          >
            Priority
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 text-xs text-muted-foreground">Loading incidents...</div>
        )}

        {!loading && error && (
          <div className="space-y-3 p-4">
            <p className="text-xs text-destructive">
              {error?.message || "Failed to load incidents."}
            </p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && incidents.length === 0 && (
          <div className="p-4 text-xs text-muted-foreground">No active incidents found.</div>
        )}

        {!loading &&
          !error &&
          incidents.map((incident) => {
            const isActive = selectedId === incident.id;
            return (
              <button
                type="button"
                key={incident.id}
                aria-label={`Select incident ${incident.id}: ${incident.title}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative block w-full cursor-pointer border-b border-border p-4 text-left transition-colors",
                  isActive ? "bg-accent/50" : "hover:bg-muted/50"
                )}
                onClick={() => onSelect(incident)}
              >
                {isActive && <div className="absolute left-0 top-0 h-full w-[3px] bg-primary" />}

                <div className="mb-1 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Incident #{incident.id}
                    </p>
                    <h3 className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-foreground")}>
                      {incident.title}
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground">{incident.timeAgo || "-"}</span>
                </div>

                <p className="mb-2 text-xs font-medium text-muted-foreground">{incident.categoryLabel || "-"}</p>

                <div className="flex items-end justify-between gap-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{incident.address || "Address unavailable"}</span>
                  </div>

                  <div className="flex gap-1.5">
                    <Badge
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-bold uppercase border-none",
                        priorityStyles[incident.priority] || priorityStyles.unknown
                      )}
                    >
                      {incident.priority || "unknown"}
                    </Badge>
                    <Badge
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-bold uppercase border-none",
                        statusStyles[incident.status] || statusStyles.unknown
                      )}
                    >
                      {incident.statusLabel || incident.status || "unknown"}
                    </Badge>
                  </div>
                </div>
              </button>
            );
          })}

        {!loading && !error && (
          <div className="p-4">
            <Link
              to="/incidents"
              className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
            >
              View all incidents
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
