import { formatDistanceToNow } from "date-fns";
import { MapPin, Phone, User, CheckCircle, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const statusStyles = {
  needs_attention: "bg-emergency text-emergency-foreground pulse-emergency",
  active: "bg-info text-info-foreground",
  acknowledged: "bg-warning text-warning-foreground",
  responding: "bg-info text-info-foreground",
  cancelled: "bg-warning text-warning-foreground",
  resolved: "bg-success text-success-foreground",
};

function formatLocation(location) {
  const address = location?.address;
  if (address) return address;

  const latitude = location?.latitude;
  const longitude = location?.longitude;
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`;
  }

  return "Location unavailable";
}

export function LiveSOSFeed({
  alerts,
  onAcknowledge,
  onResolve,
  onViewDetails,
  title = "Live SOS Feed",
  emptyTitle = "No active SOS alerts",
  emptySubtitle = "Monitoring for emergencies...",
  actionMode = "live",
  contentHeightClassName = "h-full",
}) {
  const attentionAlerts = alerts.filter((a) => a.requires_attention === true);
  const otherAlerts = alerts.filter((a) => a.requires_attention !== true);

  const getVisualState = (alert) => {
    const status = String(alert?.status || "").toLowerCase();
    if (status === "cancelled") return "cancelled";
    if (status === "resolved") return "resolved";
    if (alert?.requires_attention === true) return "needs_attention";
    if (status === "active") return "active";
    return status || "active";
  };

  const getBadgeLabel = (alert) => {
    const status = String(alert?.status || "").toLowerCase();
    if (alert?.requires_attention === true) return "NEEDS ATTENTION";
    if (status === "cancelled") return alert?.terminal_label || alert?.terminalLabel || "Cancelled SOS";
    if (status === "resolved") return alert?.terminal_label || alert?.terminalLabel || "Resolved";
    if (status === "active") return "ACKNOWLEDGED";
    return status ? status.toUpperCase() : "ACTIVE";
  };

  const hasPrimaryAction = actionMode === "live" || actionMode === "dispatch";

  const renderAlertCard = (alert, { emphasized = false } = {}) => (
    <div
      key={alert.id}
      className={cn(
        "rounded-lg border bg-card p-4 transition-colors",
        emphasized
          ? "border-2 border-emergency/50 bg-emergency/5"
          : "hover:bg-accent/50",
        alert.requires_attention ? "animate-pulse" : ""
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              "text-xs",
              statusStyles[getVisualState(alert)] || statusStyles.active
            )}
          >
            {getBadgeLabel(alert)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{alert.userName}</span>
        </div>
        {alert.assigned_unit && (
          <div className="text-xs">
            <Badge variant="outline">{alert.assigned_unit}</Badge>
          </div>
        )}
        {alert.userPhone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{alert.userPhone}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{formatLocation(alert.location)}</span>
        </div>
        {alert.message && (
          <p className="rounded bg-background/50 p-2 text-sm italic">
            "{alert.message}"
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {actionMode === "live" && (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onAcknowledge?.(alert.id)}
            disabled={!alert.requires_attention}
          >
            <CheckCircle className="mr-1 h-4 w-4" />
            Acknowledge
          </Button>
        )}
        {actionMode === "dispatch" && (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onResolve?.(alert)}
          >
            Mark as Resolved
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className={hasPrimaryAction ? "" : "w-full"}
          onClick={() => onViewDetails?.(alert.id)}
        >
          Details
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="flex min-h-0 flex-col border-emergency/20 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-emergency" />
          <CardTitle>{title}</CardTitle>
          {attentionAlerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {attentionAlerts.length} Needs Attention
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success status-dot-active" />
          <span className="text-xs text-muted-foreground">Connected</span>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-0 pb-2">
        <ScrollArea className={contentHeightClassName} data-testid="live-sos-feed-scroll-area">
          <div className="space-y-2 p-4 pb-8 pt-0">
            {attentionAlerts.map((alert) => renderAlertCard(alert, { emphasized: true }))}

            {otherAlerts.map((alert) => renderAlertCard(alert))}

            {alerts.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <Radio className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>{emptyTitle}</p>
                <p className="text-sm">{emptySubtitle}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
