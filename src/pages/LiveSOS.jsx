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

export default function LiveSOS() {
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedSosId, setSelectedSosId] = useState(null);
    const [streamThreads, setStreamThreads] = useState([]);
    const [optimisticById, setOptimisticById] = useState({});
    const [ackTargetId, setAckTargetId] = useState(null);
    const [ackAssignedUnit, setAckAssignedUnit] = useState("");
    const queueQuery = useSOSLiveQueue({ status: 'open', limit: 100 });
    const acknowledgeMutation = useAcknowledgeSOS();
    const detailQuery = useSOSDetail(selectedSosId, {
        enabled: isDetailOpen && Number.isFinite(selectedSosId),
    });

    useEffect(() => {
        if (!Array.isArray(queueQuery.data)) return;
        setStreamThreads((previous) => applySnapshot(previous, queueQuery.data));
        setOptimisticById((previous) => {
            const next = { ...previous };
            for (const thread of queueQuery.data) {
                const status = String(thread?.latest_status || thread?.status || '').toLowerCase();
                const hasServerAttentionFlag = Object.prototype.hasOwnProperty.call(thread || {}, 'requires_attention');
                const hasAcknowledgedAt = Boolean(thread?.acknowledged_at || thread?.acknowledgedAt);
                if (!hasServerAttentionFlag && !hasAcknowledgedAt && status === 'active') continue;
                delete next[toSosId(thread)];
            }
            return next;
        });
    }, [queueQuery.data]);

    const feedAlerts = useMemo(() => {
        const sourceRows = streamThreads;
        return sourceRows.map((thread) => {
            const normalized = toSosFeedAlert(thread);
            const optimistic = optimisticById[normalized.id];
            return optimistic ? { ...normalized, ...optimistic } : normalized;
        });
    }, [streamThreads, optimisticById]);
    const activeAlerts = feedAlerts.filter((a) => a.requires_attention === true);
    const acknowledgedAlerts = feedAlerts.filter((a) => a.status === 'active' && a.requires_attention === false);
    const isConnected = !queueQuery.isError;
    const alertById = useMemo(() => {
        const map = new Map();
        for (const alert of feedAlerts) {
            map.set(String(alert.id), alert);
        }
        return map;
    }, [feedAlerts]);

    const handleAcknowledge = (id) => {
        const parsedId = Number(id);
        if (!Number.isFinite(parsedId)) return;
        const alert = alertById.get(String(parsedId));
        const emergencyType = String(alert?.emergencyType || "").trim().toLowerCase();
        const autoUnit = ASSIGNED_UNIT_BY_EMERGENCY_TYPE[emergencyType] || "";
        setAckTargetId(parsedId);
        setAckAssignedUnit(autoUnit);
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

    return (
        <DashboardLayout
            title="Live SOS"
            subtitle="Real-time emergency monitoring from backend live queue"
        >
            {/* Connection Status */}
            <Card className="mb-6">
                <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                        <Radio className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-medium">Backend Live Queue Connection</p>
                            <p className="text-sm text-muted-foreground">
                                Polling SOS live queue every 5 seconds
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

            {/* Stats */}
            <div className="mb-6 grid gap-4 md:grid-cols-3">
                <Card className="border-emergency/20 bg-emergency/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active SOS
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emergency">
                            {activeAlerts.length}
                        </div>
                        <p className="text-sm text-muted-foreground">Requiring immediate response</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Acknowledged
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-warning">
                            {acknowledgedAlerts.length}
                        </div>
                        <p className="text-sm text-muted-foreground">Being processed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Today
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{feedAlerts.length}</div>
                        <p className="text-sm text-muted-foreground">SOS alerts received</p>
                    </CardContent>
                </Card>
            </div>

            {queueQuery.isLoading && (
                <Alert className="mb-6">
                    <AlertDescription>Loading live SOS queue...</AlertDescription>
                </Alert>
            )}

            {queueQuery.isError && (
                <Alert variant="destructive" className="mb-6">
                    <AlertDescription>
                        {queueQuery.error?.message || 'Failed to load live SOS queue.'}
                    </AlertDescription>
                </Alert>
            )}

            {/* Live Feed */}
            <LiveSOSFeed
                alerts={feedAlerts}
                onAcknowledge={handleAcknowledge}
                onViewDetails={(id) => {
                    const parsedId = Number(id);
                    if (!Number.isFinite(parsedId)) return;
                    setSelectedSosId(parsedId);
                    setIsDetailOpen(true);
                }}
            />
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
