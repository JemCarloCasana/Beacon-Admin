import { formatDistanceToNow } from "date-fns";
import { Siren, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatTimestamp(timestamp) {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "-";
  return formatDistanceToNow(date, { addSuffix: true });
}

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
  onAcknowledge,
  onClose,
  onGoToSosWorkspace,
}) {
  if (loading) {
    return <div className="border-l-4 border-l-slate-300 bg-slate-50 p-4 text-xs text-slate-600">Loading live SOS data...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-between border-l-4 border-l-red-500 bg-red-50 p-4">
        <p className="text-xs text-red-700">{error?.message || "Failed to load live SOS alerts."}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="flex items-center justify-between border-l-4 border-l-emerald-500 bg-emerald-50 p-4">
        <p className="text-xs font-medium text-emerald-800">No SOS alerts requiring immediate attention.</p>
        <Button size="sm" variant="outline" onClick={onGoToSosWorkspace}>
          Open Live SOS
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border-l-4 border-l-red-500 bg-red-50 p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
          <Siren className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-red-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
            </span>
            ACTIVE SOS - {formatTimestamp(alert.timestamp)}
          </div>
          <h3 className="text-base font-semibold leading-tight text-slate-900">{alert.name || "Unknown User"}</h3>
          <p className="text-xs font-medium text-slate-500">{resolveLocation(alert)}</p>
          {alert.description && (
            <p className="mt-1 text-xs italic font-medium tracking-tight text-orange-700">"{alert.description}"</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={() => onDispatch(alert.id)} className="h-9 bg-red-600 px-5 font-semibold text-white hover:bg-red-700">
          Dispatch Unit
        </Button>
        <Button
          variant="outline"
          onClick={() => onAcknowledge(alert.id)}
          className="h-9 border-red-200 font-semibold text-red-700 hover:bg-red-50"
        >
          Acknowledge
        </Button>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
