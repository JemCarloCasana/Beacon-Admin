import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout';
import { LiveSOSDetailsDialog, LiveSOSFeed } from '@/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAcknowledgeSOS, SOS_ASSIGNED_UNITS, useSOSDetail, useSOSLiveQueue } from '@/api/useSosAPI';
import { toSosFeedAlert } from '@/models/sos-live.model';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Radio, Wifi, WifiOff } from 'lucide-react';

const ASSIGNED_UNIT_BY_EMERGENCY_TYPE = {
    medical: "Emergency Medical Unit",
    fire: "Fire Station Unit",
    violence: "Police Personnel",
};

function toSosId(thread) {
    if (!thread) return '';
    return String(thread?.sos_id ?? thread?.id ?? '');
}

function applySnapshot(_previous, snapshotThreads) {
    const map = new Map();
    for (const thread of Array.isArray(snapshotThreads) ? snapshotThreads : []) {
        const id = toSosId(thread);
        if (!id) continue;
        map.set(id, thread);
    }
    return Array.from(map.values());
}

function isCancelledAlert(alert) {
    const status = String(alert?.status || '').trim().toLowerCase();
    const terminalStatus = String(alert?.raw?.terminal_status || alert?.terminal_status || '').trim().toLowerCase();
    const label = String(alert?.terminal_label || alert?.terminalLabel || '').trim().toLowerCase();
    const message = String(alert?.message || alert?.raw?.latest_message || '').trim().toLowerCase();
    return (
        status === 'cancelled'
        || terminalStatus === 'cancelled'
        || label === 'cancelled sos'
        || /^cancelled\s*:/.test(message)
    );
}

function dedupeAlertsById(alerts) {
    const map = new Map();
    for (const alert of alerts) {
        const id = String(alert?.id || '');
        if (!id) continue;
        map.set(id, alert);
    }
    return Array.from(map.values());
}

export default function LiveSOS() {
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedSosId, setSelectedSosId] = useState(null);
    const [streamThreads, setStreamThreads] = useState([]);
    const [optimisticById, setOptimisticById] = useState({});
    const [ackTargetId, setAckTargetId] = useState(null);
    const [ackAssignedUnit, setAckAssignedUnit] = useState("");

    const liveQueueQuery = useSOSLiveQueue({ status: 'open', limit: 100 });
    const cancelledQueueQuery = useSOSLiveQueue({ status: 'cancelled', limit: 100 });
    const resolvedQueueQuery = useSOSLiveQueue({ status: 'resolved', limit: 100 });
    const acknowledgeMutation = useAcknowledgeSOS();
    const detailQuery = useSOSDetail(selectedSosId, {
        enabled: isDetailOpen && Number.isFinite(selectedSosId),
    });

    useEffect(() => {
        if (!Array.isArray(liveQueueQuery.data)) return;
        setStreamThreads((previous) => applySnapshot(previous, liveQueueQuery.data));
        setOptimisticById((previous) => {
            const next = { ...previous };
            for (const thread of liveQueueQuery.data) {
                const status = String(thread?.latest_status || thread?.status || '').toLowerCase();
                const hasServerAttentionFlag = Object.prototype.hasOwnProperty.call(thread || {}, 'requires_attention');
                const hasAcknowledgedAt = Boolean(thread?.acknowledged_at || thread?.acknowledgedAt);
                if (!hasServerAttentionFlag && !hasAcknowledgedAt && status === 'active') continue;
                delete next[toSosId(thread)];
            }
            return next;
        });
    }, [liveQueueQuery.data]);

    const liveAlerts = useMemo(() => {
        return streamThreads.map((thread) => {
            const normalized = toSosFeedAlert(thread);
            const optimistic = optimisticById[normalized.id];
            return optimistic ? { ...normalized, ...optimistic } : normalized;
        });
    }, [streamThreads, optimisticById]);

    const cancelledPoolAlerts = useMemo(() => {
        const rows = Array.isArray(cancelledQueueQuery.data) ? cancelledQueueQuery.data : [];
        return rows.map((thread) => toSosFeedAlert(thread));
    }, [cancelledQueueQuery.data]);

    const resolvedPoolAlerts = useMemo(() => {
        const rows = Array.isArray(resolvedQueueQuery.data) ? resolvedQueueQuery.data : [];
        return rows.map((thread) => toSosFeedAlert(thread));
    }, [resolvedQueueQuery.data]);

    const cancelledAlerts = useMemo(
        () => dedupeAlertsById([
            ...cancelledPoolAlerts.filter((alert) => isCancelledAlert(alert)),
            ...resolvedPoolAlerts.filter((alert) => isCancelledAlert(alert)),
        ]),
        [cancelledPoolAlerts, resolvedPoolAlerts]
    );
    const resolvedAlerts = useMemo(
        () => resolvedPoolAlerts.filter((alert) => !isCancelledAlert(alert)),
        [resolvedPoolAlerts]
    );

    const attentionAlerts = liveAlerts.filter((a) => a.requires_attention === true);
    const isConnected = !liveQueueQuery.isError && !cancelledQueueQuery.isError && !resolvedQueueQuery.isError;

    const alertById = useMemo(() => {
        const map = new Map();
        for (const alert of [...liveAlerts, ...cancelledAlerts, ...resolvedAlerts]) {
            map.set(String(alert.id), alert);
        }
        return map;
    }, [liveAlerts, cancelledAlerts, resolvedAlerts]);

    const handleAcknowledge = (id) => {
        const parsedId = Number(id);
        if (!Number.isFinite(parsedId)) return;
        const alert = alertById.get(String(parsedId));
        const emergencyType = String(alert?.emergencyType || "").trim().toLowerCase();
        const autoUnit = ASSIGNED_UNIT_BY_EMERGENCY_TYPE[emergencyType] || "";
        setAckTargetId(parsedId);
        setAckAssignedUnit(autoUnit);
    };

    const handleOpenDetails = (id) => {
        const parsedId = Number(id);
        if (!Number.isFinite(parsedId)) return;
        setSelectedSosId(parsedId);
        setIsDetailOpen(true);
    };

    const handleConfirmAcknowledge = async () => {
        const parsedId = Number(ackTargetId);
        const assignedUnit = String(ackAssignedUnit || "").trim();
        if (!Number.isFinite(parsedId) || !assignedUnit) return;
        const nowIso = new Date().toISOString();

        try {
            await acknowledgeMutation.mutateAsync({
                sosId: parsedId,
                assigned_unit: assignedUnit,
                note: `Acknowledged and assigned to ${assignedUnit}`,
            });
            setOptimisticById((previous) => ({
                ...previous,
                [String(parsedId)]: {
                    requires_attention: false,
                    acknowledged_at: nowIso,
                    assigned_unit: assignedUnit,
                    assignedUnit,
                },
            }));
            setAckTargetId(null);
            setAckAssignedUnit("");
        } catch (_error) {
            // Keep existing server-driven state on mutation failure.
        }
    };

    const isQueueLoading = liveQueueQuery.isLoading || cancelledQueueQuery.isLoading || resolvedQueueQuery.isLoading;
    const queueError = liveQueueQuery.error || cancelledQueueQuery.error || resolvedQueueQuery.error || null;

    return (
        <DashboardLayout
            title="SOS Screen"
            subtitle="Real-time monitoring of live, cancelled, and resolved SOS threads"
        >
            <Card className="mb-6">
                <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                        <Radio className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-medium">Backend SOS Queue Connection</p>
                            <p className="text-sm text-muted-foreground">
                                Polling SOS queues every 5 seconds
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isConnected ? (
                            <>
                                <Wifi className="h-4 w-4 text-success" />
                                <Badge variant="outline" className="border-success text-success">
                                    Connected
                                </Badge>
                            </>
                        ) : (
                            <>
                                <WifiOff className="h-4 w-4 text-destructive" />
                                <Badge variant="outline" className="border-destructive text-destructive">
                                    Disconnected
                                </Badge>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="mb-6 grid gap-4 md:grid-cols-3">
                <Card className="border-emergency/20 bg-emergency/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Live SOS
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emergency">
                            {liveAlerts.length}
                        </div>
                        <p className="text-sm text-muted-foreground">Open SOS threads</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Cancelled SOS
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-warning">
                            {cancelledAlerts.length}
                        </div>
                        <p className="text-sm text-muted-foreground">Cancelled outcomes</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Resolved SOS
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-success">{resolvedAlerts.length}</div>
                        <p className="text-sm text-muted-foreground">Resolved outcomes</p>
                    </CardContent>
                </Card>
            </div>

            {isQueueLoading && (
                <Alert className="mb-6">
                    <AlertDescription>Loading SOS queues...</AlertDescription>
                </Alert>
            )}

            {queueError && (
                <Alert variant="destructive" className="mb-6">
                    <AlertDescription>
                        {queueError?.message || 'Failed to load SOS queues.'}
                    </AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="live">
                <TabsList className="mb-4 w-full justify-start">
                    <TabsTrigger value="live">Live SOS ({liveAlerts.length})</TabsTrigger>
                    <TabsTrigger value="cancelled">Cancelled SOS ({cancelledAlerts.length})</TabsTrigger>
                    <TabsTrigger value="resolved">Resolved SOS ({resolvedAlerts.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="live">
                    <LiveSOSFeed
                        alerts={liveAlerts}
                        title="Live SOS Feed"
                        emptyTitle="No live SOS alerts"
                        emptySubtitle="Monitoring for emergencies..."
                        onAcknowledge={handleAcknowledge}
                        onViewDetails={handleOpenDetails}
                    />
                    {attentionAlerts.length === 0 && liveAlerts.length > 0 && (
                        <p className="mt-3 text-xs text-muted-foreground">All live SOS threads are acknowledged.</p>
                    )}
                </TabsContent>

                <TabsContent value="cancelled">
                    <LiveSOSFeed
                        alerts={cancelledAlerts}
                        title="Cancelled SOS"
                        emptyTitle="No cancelled SOS"
                        emptySubtitle="Cancelled outcomes will appear here."
                        showAcknowledge={false}
                        onViewDetails={handleOpenDetails}
                    />
                </TabsContent>

                <TabsContent value="resolved">
                    <LiveSOSFeed
                        alerts={resolvedAlerts}
                        title="Resolved SOS"
                        emptyTitle="No resolved SOS"
                        emptySubtitle="Resolved outcomes will appear here."
                        showAcknowledge={false}
                        onViewDetails={handleOpenDetails}
                    />
                </TabsContent>
            </Tabs>

            <Dialog
                open={ackTargetId !== null && Number.isFinite(Number(ackTargetId))}
                onOpenChange={(open) => {
                    if (!open) {
                        setAckTargetId(null);
                        setAckAssignedUnit("");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Acknowledge SOS</DialogTitle>
                        <DialogDescription>
                            Select the assigned unit before confirming acknowledgement.
                        </DialogDescription>
                    </DialogHeader>
                    {(() => {
                        const alert = ackTargetId ? alertById.get(String(ackTargetId)) : null;
                        if (!alert?.emergencyType || alert.emergencyType === "unknown") return null;
                        return (
                            <p className="text-xs text-muted-foreground">
                                Auto-selected from emergency type: <span className="font-medium capitalize">{alert.emergencyType}</span>
                            </p>
                        );
                    })()}
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Assigned Unit</p>
                        <Select value={ackAssignedUnit} onValueChange={setAckAssignedUnit}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select assigned unit" />
                            </SelectTrigger>
                            <SelectContent>
                                {SOS_ASSIGNED_UNITS.map((unit) => (
                                    <SelectItem key={unit} value={unit}>
                                        {unit}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setAckTargetId(null);
                                setAckAssignedUnit("");
                            }}
                            disabled={acknowledgeMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmAcknowledge}
                            disabled={!ackAssignedUnit || acknowledgeMutation.isPending}
                        >
                            {acknowledgeMutation.isPending ? "Acknowledging..." : "Confirm Acknowledge"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <LiveSOSDetailsDialog
                open={isDetailOpen}
                detailQuery={detailQuery}
                detailOverride={selectedSosId ? optimisticById[String(selectedSosId)] : null}
                onOpenChange={(open) => {
                    setIsDetailOpen(open);
                    if (!open) {
                        setSelectedSosId(null);
                    }
                }}
            />
        </DashboardLayout>
    );
}
