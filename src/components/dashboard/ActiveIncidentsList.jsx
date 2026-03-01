import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "dispatched", label: "Dispatched" },
  { value: "in_progress", label: "In Progress" },
];

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
    <div className="flex h-full flex-col bg-white">
      <div className="space-y-3 border-b border-slate-100 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Active Incidents
            <span className="ml-2 text-xs font-medium text-slate-500">({incidents.length})</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
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
          >
            {sortByPriority ? "Priority Sorted" : "Sort by Priority"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 text-xs text-slate-500">Loading incidents...</div>
        )}

        {!loading && error && (
          <div className="space-y-3 p-4">
            <p className="text-xs text-red-600">
              {error?.message || "Failed to load incidents."}
            </p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && incidents.length === 0 && (
          <div className="p-4 text-xs text-slate-500">No active incidents found.</div>
        )}

        {!loading &&
          !error &&
          incidents.map((incident) => {
            const isActive = selectedId === incident.id;
            return (
              <div
                key={incident.id}
                className={cn(
                  "relative cursor-pointer border-b border-slate-50 p-4 transition-colors",
                  isActive ? "bg-blue-50/40" : "hover:bg-slate-50"
                )}
                onClick={() => onSelect(incident)}
              >
                {isActive && <div className="absolute left-0 top-0 h-full w-[3px] bg-blue-600" />}

                <div className="mb-1 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Incident #{incident.id}
                    </p>
                    <h3 className={cn("text-sm font-semibold", isActive ? "text-blue-700" : "text-slate-900")}>
                      {incident.title}
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500">{incident.timeAgo || "-"}</span>
                </div>

                <p className="mb-2 text-xs font-medium text-slate-600">{incident.categoryLabel || "-"}</p>

                <div className="flex items-end justify-between gap-2">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{incident.address || "Address unavailable"}</span>
                  </div>

                  <div className="flex gap-1.5">
                    <Badge
                      className={cn(
                        "rounded px-2 py-0.5 text-[9px] font-bold uppercase border-none",
                        incident.priority === "critical"
                          ? "bg-red-50 text-red-600"
                          : incident.priority === "high"
                            ? "bg-orange-50 text-orange-600"
                            : incident.priority === "medium"
                              ? "bg-yellow-50 text-yellow-700"
                              : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {incident.priority || "unknown"}
                    </Badge>
                    <Badge
                      className={cn(
                        "rounded px-2 py-0.5 text-[9px] font-bold uppercase border-none",
                        incident.status === "pending"
                          ? "bg-amber-50 text-amber-700"
                          : incident.status === "dispatched"
                            ? "bg-blue-50 text-blue-700"
                            : incident.status === "in_progress"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {incident.statusLabel || incident.status || "unknown"}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
