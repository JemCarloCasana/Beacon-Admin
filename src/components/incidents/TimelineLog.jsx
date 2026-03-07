import { Clock3 } from "lucide-react";
import { format, formatDistanceStrict } from "date-fns";

function toDateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatTimelineDate(value) {
  const date = toDateOrNull(value);
  if (!date) return null;
  return format(date, "MMM d, yyyy h:mm a");
}

function formatElapsed(previous, current) {
  const previousDate = toDateOrNull(previous);
  const currentDate = toDateOrNull(current);
  if (!previousDate || !currentDate) return null;
  if (currentDate.getTime() <= previousDate.getTime()) return null;
  return formatDistanceStrict(previousDate, currentDate);
}

function buildTimelineItems(incident) {
  const milestones = [
    { key: "created", label: "Reported", timestamp: incident?.createdAt || null },
    { key: "dispatched", label: "Dispatched", timestamp: incident?.dispatchedAt || null },
    { key: "updated", label: "Updated", timestamp: incident?.updatedAt || null },
    { key: "resolved", label: "Resolved", timestamp: incident?.resolvedAt || null },
  ];

  const visible = milestones.filter((item) => toDateOrNull(item.timestamp));

  return visible.map((item, index) => {
    const previous = visible[index - 1] || null;
    return {
      ...item,
      displayTime: formatTimelineDate(item.timestamp),
      elapsedSincePrevious: previous
        ? formatElapsed(previous.timestamp, item.timestamp)
        : null,
      resolutionNotes:
        item.key === "resolved" && incident?.resolutionNotes
          ? String(incident.resolutionNotes).trim()
          : "",
    };
  });
}

export function TimelineLog({ incident }) {
  const items = buildTimelineItems(incident);

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Clock3 className="h-4 w-4 text-muted-foreground" />
        <span>Timeline</span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No timeline data available.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.key} className="rounded-md border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.displayTime}</p>
              </div>

              {item.elapsedSincePrevious && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.elapsedSincePrevious} after previous step
                </p>
              )}

              {item.key === "resolved" && item.resolutionNotes && (
                <div className="mt-2 rounded border bg-background p-2">
                  <p className="text-xs font-medium text-muted-foreground">Resolution Notes</p>
                  <p className="mt-1 text-sm">{item.resolutionNotes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TimelineLog;
